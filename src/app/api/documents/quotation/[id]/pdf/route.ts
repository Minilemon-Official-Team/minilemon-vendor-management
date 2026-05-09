import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderPDF, fileKeyToDataUrl } from '@/lib/pdf'
import { getS3Object, putS3Object } from '@/lib/s3'
import { QuotationDocument, QUOTATION_PDF_CSS } from '@/pdf-templates/QuotationDocument'
import { getCompanyInfo } from '@/lib/nda'
import { findQuotationForPDF } from '@/queries/quotations'

export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const quotation = await findQuotationForPDF(id)
  if (!quotation) return new Response('Not found', { status: 404 })

  if (session.user.role !== 'ADMIN' && quotation.vendorId !== session.user.vendorId) {
    return new Response('Forbidden', { status: 403 })
  }

  let pdfBuffer: Buffer
  if (quotation.status === 'SIGNED' && quotation.pdfFileKey) {
    pdfBuffer = await getS3Object(quotation.pdfFileKey)
  } else {
    const company = await getCompanyInfo()
    const [vendorSig, adminSig] = await Promise.all([
      quotation.vendorSignatureKey ? fileKeyToDataUrl(quotation.vendorSignatureKey) : undefined,
      quotation.adminSignatureKey ? fileKeyToDataUrl(quotation.adminSignatureKey) : undefined,
    ])
    try {
      pdfBuffer = await renderPDF(
        QuotationDocument({
          quotation,
          vendor: quotation.vendor,
          company,
          vendorSignatureDataUrl: vendorSig,
          adminSignatureDataUrl: adminSig,
        }),
        { inlineCss: QUOTATION_PDF_CSS },
      )
    } catch (e) {
      console.error('[quotation pdf] render failed', e)
      return NextResponse.json({ error: 'Gagal membuat PDF' }, { status: 500 })
    }
    if (quotation.status === 'SIGNED') {
      const year = new Date().getFullYear()
      const key = `documents/quotation/${year}/${quotation.docNumber.replace(/\//g, '-')}.pdf`
      await putS3Object(key, pdfBuffer, 'application/pdf')
      await prisma.quotation.update({ where: { id }, data: { pdfFileKey: key } })
    }
  }

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quotation.docNumber.replace(/\//g, '-')}.pdf"`,
      'Cache-Control': quotation.status === 'SIGNED' ? 'private, max-age=3600' : 'no-store',
    },
  })
}

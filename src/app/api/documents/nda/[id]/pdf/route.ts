import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderPDF, fileKeyToDataUrl } from '@/lib/pdf'
import { getS3Object, putS3Object } from '@/lib/s3'
import { NDADocument, NDA_PDF_CSS } from '@/pdf-templates/NDADocument'
import { getCompanyInfo } from '@/lib/nda'
import { findNDAById } from '@/queries/nda'
import type { VendorSnapshot } from '@/schemas/nda'

export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const nda = await findNDAById(id)
  if (!nda) return new Response('Not found', { status: 404 })

  if (session.user.role !== 'ADMIN' && nda.vendorId !== session.user.vendorId) {
    return new Response('Forbidden', { status: 403 })
  }

  let pdfBuffer: Buffer

  if (nda.status === 'SIGNED' && nda.pdfFileKey) {
    pdfBuffer = await getS3Object(nda.pdfFileKey)
  } else {
    const company = await getCompanyInfo()
    const [vendorSig, adminSig] = await Promise.all([
      nda.vendorSignatureKey ? fileKeyToDataUrl(nda.vendorSignatureKey) : undefined,
      nda.adminSignatureKey ? fileKeyToDataUrl(nda.adminSignatureKey) : undefined,
    ])
    try {
      pdfBuffer = await renderPDF(
        NDADocument({
          docNumber: nda.docNumber,
          effectiveDate: nda.effectiveDate,
          vendor: nda.vendorSnapshot as unknown as VendorSnapshot,
          company,
          vendorSignatureDataUrl: vendorSig,
          adminSignatureDataUrl: adminSig,
          vendorSignedAt: nda.vendorSignedAt,
          adminSignedAt: nda.adminSignedAt,
          status: nda.status as any,
        }),
        { inlineCss: NDA_PDF_CSS },
      )
    } catch (e) {
      console.error('[nda pdf] render failed', e)
      return NextResponse.json({ error: 'Gagal membuat PDF' }, { status: 500 })
    }
    if (nda.status === 'SIGNED') {
      const year = new Date().getFullYear()
      const key = `documents/nda/${year}/${nda.docNumber.replace(/\//g, '-')}.pdf`
      await putS3Object(key, pdfBuffer, 'application/pdf')
      await prisma.nDA.update({ where: { id }, data: { pdfFileKey: key } })
    }
  }

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nda.docNumber.replace(/\//g, '-')}.pdf"`,
      'Cache-Control': nda.status === 'SIGNED' ? 'private, max-age=3600' : 'no-store',
    },
  })
}

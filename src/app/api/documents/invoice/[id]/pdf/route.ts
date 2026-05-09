import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderPDF, fileKeyToDataUrl } from '@/lib/pdf'
import { getS3Object, putS3Object } from '@/lib/s3'
import { InvoiceDocument, INVOICE_PDF_CSS } from '@/pdf-templates/InvoiceDocument'
import { getCompanyInfo } from '@/lib/nda'
import { findInvoiceForPDF } from '@/queries/invoices'

export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const invoice = await findInvoiceForPDF(id)
  if (!invoice) return new Response('Not found', { status: 404 })

  if (session.user.role !== 'ADMIN' && invoice.vendorId !== session.user.vendorId) {
    return new Response('Forbidden', { status: 403 })
  }

  let pdfBuffer: Buffer
  if ((invoice.status === 'APPROVED' || invoice.paidAt) && invoice.pdfFileKey && !invoice.paidAt) {
    pdfBuffer = await getS3Object(invoice.pdfFileKey)
  } else {
    const company = await getCompanyInfo()
    const vendorSig = invoice.vendorSignatureKey ? await fileKeyToDataUrl(invoice.vendorSignatureKey) : undefined
    try {
      pdfBuffer = await renderPDF(
        InvoiceDocument({
          invoice,
          vendor: invoice.vendor,
          company,
          vendorSignatureDataUrl: vendorSig,
        }),
        { inlineCss: INVOICE_PDF_CSS },
      )
    } catch (e) {
      console.error('[invoice pdf] render failed', e)
      return NextResponse.json({ error: 'Gagal membuat PDF' }, { status: 500 })
    }
    if (invoice.status === 'APPROVED' && !invoice.pdfFileKey) {
      const year = new Date().getFullYear()
      const key = `documents/invoice/${year}/${invoice.docNumber.replace(/\//g, '-')}.pdf`
      await putS3Object(key, pdfBuffer, 'application/pdf')
      await prisma.invoice.update({ where: { id }, data: { pdfFileKey: key } })
    }
  }

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.docNumber.replace(/\//g, '-')}.pdf"`,
      'Cache-Control': 'private, max-age=600',
    },
  })
}

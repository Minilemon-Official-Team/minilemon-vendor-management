import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderPDF, fileKeyToDataUrl } from '@/lib/pdf'
import { getS3Object, putS3Object } from '@/lib/s3'
import { SPKDocument, SPK_PDF_CSS } from '@/pdf-templates/SPKDocument'
import { getCompanyInfo } from '@/lib/nda'
import { findSPKById } from '@/queries/spk'

export const maxDuration = 60

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const spk = await findSPKById(id)
  if (!spk) return new Response('Not found', { status: 404 })

  if (session.user.role !== 'ADMIN' && spk.vendorId !== session.user.vendorId) {
    return new Response('Forbidden', { status: 403 })
  }

  let pdfBuffer: Buffer
  if (spk.status === 'SIGNED' && spk.pdfFileKey) {
    pdfBuffer = await getS3Object(spk.pdfFileKey)
  } else {
    const company = await getCompanyInfo()
    const [vendorSig, adminSig] = await Promise.all([
      spk.vendorSignatureKey ? fileKeyToDataUrl(spk.vendorSignatureKey) : undefined,
      spk.adminSignatureKey ? fileKeyToDataUrl(spk.adminSignatureKey) : undefined,
    ])
    try {
      pdfBuffer = await renderPDF(
        SPKDocument({
          spk,
          company,
          vendorSignatureDataUrl: vendorSig,
          adminSignatureDataUrl: adminSig,
        }),
        { inlineCss: SPK_PDF_CSS },
      )
    } catch (e) {
      console.error('[spk pdf] render failed', e)
      return NextResponse.json({ error: 'Gagal membuat PDF' }, { status: 500 })
    }
    if (spk.status === 'SIGNED') {
      const year = new Date().getFullYear()
      const key = `documents/spk/${year}/${spk.docNumber.replace(/\//g, '-')}.pdf`
      await putS3Object(key, pdfBuffer, 'application/pdf')
      await prisma.sPK.update({ where: { id }, data: { pdfFileKey: key } })
    }
  }

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${spk.docNumber.replace(/\//g, '-')}.pdf"`,
      'Cache-Control': spk.status === 'SIGNED' ? 'private, max-age=3600' : 'no-store',
    },
  })
}

import { prisma } from '@/lib/prisma'
import { getCompanyInfo } from '@/lib/nda'
import { getSignedDownloadUrl } from '@/lib/s3'

export async function findNDAById(id: string) {
  return prisma.nDA.findUnique({ where: { id } })
}

export async function getActiveVendorNDA(vendorId: string) {
  const nda = await prisma.nDA.findFirst({
    where: { vendorId, status: { not: 'SUPERSEDED' } },
    orderBy: { createdAt: 'desc' },
  })
  if (!nda) return null

  const [company, vendorSigUrl, adminSigUrl] = await Promise.all([
    getCompanyInfo(),
    nda.vendorSignatureKey ? getSignedDownloadUrl(nda.vendorSignatureKey).catch(() => undefined) : undefined,
    nda.adminSignatureKey ? getSignedDownloadUrl(nda.adminSignatureKey).catch(() => undefined) : undefined,
  ])

  return { nda, company, vendorSigUrl, adminSigUrl }
}

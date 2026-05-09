import { prisma } from '@/lib/prisma'

export async function findQuotationForPDF(id: string) {
  return prisma.quotation.findUnique({
    where: { id },
    include: { vendor: true, project: true },
  })
}

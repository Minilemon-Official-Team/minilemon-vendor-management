import { prisma } from '@/lib/prisma'

export async function findInvoiceForPDF(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { vendor: true },
  })
}

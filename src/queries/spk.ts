import { prisma } from '@/lib/prisma'

export async function findSPKById(id: string) {
  return prisma.sPK.findUnique({ where: { id } })
}

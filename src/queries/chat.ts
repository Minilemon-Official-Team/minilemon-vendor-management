import { prisma } from '@/lib/prisma'

export async function getProjectAccessInfo(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, vendorId: true },
  })
}

export async function listChatMessages(projectId: string, since?: Date) {
  return prisma.chatMessage.findMany({
    where: {
      projectId,
      ...(since ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { sender: { select: { id: true, fullName: true, role: true } } },
  })
}

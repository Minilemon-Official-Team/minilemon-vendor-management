import { prisma } from '@/lib/prisma'

export async function listUserNotifications(userId: string, take = 20) {
  const [data, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ])
  return { data, unreadCount }
}

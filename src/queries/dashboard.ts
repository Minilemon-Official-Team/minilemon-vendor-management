import { prisma } from '@/lib/prisma'
import { IN_PROGRESS_STATUSES } from '@/lib/constants'
import { startOfMonth } from '@/lib/utils'

export async function getAdminDashboard() {
  const [activeVendors, activeProjects, pendingNDA, completedThisMonth, recentVendors, recentProjects] =
    await Promise.all([
      prisma.vendor.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.project.count({
        where: { status: { in: [...IN_PROGRESS_STATUSES] }, deletedAt: null },
      }),
      prisma.vendor.count({ where: { status: 'PENDING_ADMIN_SIGN', deletedAt: null } }),
      prisma.project.count({ where: { completedAt: { gte: startOfMonth() } } }),
      prisma.vendor.findMany({
        where: { deletedAt: null },
        orderBy: { invitedAt: 'desc' },
        take: 5,
        include: { user: { select: { email: true } } },
      }),
      prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { lastUpdatedAt: 'desc' },
        take: 5,
        include: { vendor: { select: { fullName: true } } },
      }),
    ])

  return {
    counts: { activeVendors, activeProjects, pendingNDA, completedThisMonth },
    recentVendors,
    recentProjects,
  }
}

export async function getVendorDashboard(userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } })
  if (!vendor) return { vendor: null, projects: [], counts: { inProgress: 0, pending: 0, completed: 0 } }

  if (vendor.status !== 'ACTIVE') {
    return { vendor, projects: [], counts: { inProgress: 0, pending: 0, completed: 0 } }
  }

  const baseWhere = { vendorId: vendor.id, deletedAt: null }
  const [projects, inProgress, pending, completed] = await Promise.all([
    prisma.project.findMany({
      where: baseWhere,
      orderBy: { lastUpdatedAt: 'desc' },
      take: 10,
    }),
    prisma.project.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
    prisma.project.count({
      where: { ...baseWhere, status: { in: ['QUOTATION_PENDING', 'SPK_PENDING_SIGN', 'INVOICE_SUBMITTED'] } },
    }),
    prisma.project.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
  ])

  return { vendor, projects, counts: { inProgress, pending, completed } }
}

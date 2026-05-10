import { prisma } from '@/lib/prisma'
import type { DocumentStatus } from '@prisma/client'

export type DocumentRow = {
  id: string
  type: 'NDA' | 'QUOTATION' | 'SPK' | 'INVOICE'
  docNumber: string
  status: DocumentStatus
  vendorName: string
  vendorCode: string
  projectName: string | null
  amount: number | null
  updatedAt: Date
  hasPdf: boolean
}

interface ListDocumentsInput {
  vendorId?: string
  type?: 'NDA' | 'QUOTATION' | 'SPK' | 'INVOICE' | 'all'
  status?: string
  q?: string
}

export async function listDocuments(input: ListDocumentsInput): Promise<DocumentRow[]> {
  const baseVendor = input.vendorId ? { vendorId: input.vendorId } : {}
  const search = input.q?.trim()
  const status = input.status as DocumentStatus | undefined
  const validStatus = status && Object.values({} as Record<DocumentStatus, true>) ? status : undefined

  const includeNDA = !input.type || input.type === 'all' || input.type === 'NDA'
  const includeQTN = !input.type || input.type === 'all' || input.type === 'QUOTATION'
  const includeSPK = !input.type || input.type === 'all' || input.type === 'SPK'
  const includeINV = !input.type || input.type === 'all' || input.type === 'INVOICE'

  const vendorSelect = { vendor: { select: { fullName: true, vendorCode: true } } }
  const projectSelect = { project: { select: { name: true } } }

  const [ndas, quotations, spks, invoices] = await Promise.all([
    includeNDA
      ? prisma.nDA.findMany({
          where: {
            ...baseVendor,
            ...(status ? { status } : {}),
            ...(search ? { docNumber: { contains: search, mode: 'insensitive' } } : {}),
          },
          select: {
            id: true,
            docNumber: true,
            status: true,
            updatedAt: true,
            pdfFileKey: true,
            ...vendorSelect,
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        })
      : Promise.resolve([]),
    includeQTN
      ? prisma.quotation.findMany({
          where: {
            ...baseVendor,
            ...(status ? { status } : {}),
            ...(search ? { docNumber: { contains: search, mode: 'insensitive' } } : {}),
          },
          select: {
            id: true,
            docNumber: true,
            status: true,
            updatedAt: true,
            grandTotal: true,
            pdfFileKey: true,
            ...vendorSelect,
            ...projectSelect,
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        })
      : Promise.resolve([]),
    includeSPK
      ? prisma.sPK.findMany({
          where: {
            ...baseVendor,
            ...(status ? { status } : {}),
            ...(search ? { docNumber: { contains: search, mode: 'insensitive' } } : {}),
          },
          select: {
            id: true,
            docNumber: true,
            status: true,
            updatedAt: true,
            pdfFileKey: true,
            ...vendorSelect,
            ...projectSelect,
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        })
      : Promise.resolve([]),
    includeINV
      ? prisma.invoice.findMany({
          where: {
            ...baseVendor,
            ...(status ? { status } : {}),
            ...(search ? { docNumber: { contains: search, mode: 'insensitive' } } : {}),
          },
          select: {
            id: true,
            docNumber: true,
            status: true,
            updatedAt: true,
            amount: true,
            pdfFileKey: true,
            ...vendorSelect,
            ...projectSelect,
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        })
      : Promise.resolve([]),
  ])

  const rows: DocumentRow[] = [
    ...ndas.map((d) => ({
      id: d.id,
      type: 'NDA' as const,
      docNumber: d.docNumber,
      status: d.status,
      vendorName: d.vendor.fullName,
      vendorCode: d.vendor.vendorCode,
      projectName: null,
      amount: null,
      updatedAt: d.updatedAt,
      hasPdf: !!d.pdfFileKey,
    })),
    ...quotations.map((d) => ({
      id: d.id,
      type: 'QUOTATION' as const,
      docNumber: d.docNumber,
      status: d.status,
      vendorName: d.vendor.fullName,
      vendorCode: d.vendor.vendorCode,
      projectName: d.project.name,
      amount: Number(d.grandTotal),
      updatedAt: d.updatedAt,
      hasPdf: !!d.pdfFileKey,
    })),
    ...spks.map((d) => ({
      id: d.id,
      type: 'SPK' as const,
      docNumber: d.docNumber,
      status: d.status,
      vendorName: d.vendor.fullName,
      vendorCode: d.vendor.vendorCode,
      projectName: d.project.name,
      amount: null,
      updatedAt: d.updatedAt,
      hasPdf: !!d.pdfFileKey,
    })),
    ...invoices.map((d) => ({
      id: d.id,
      type: 'INVOICE' as const,
      docNumber: d.docNumber,
      status: d.status,
      vendorName: d.vendor.fullName,
      vendorCode: d.vendor.vendorCode,
      projectName: d.project.name,
      amount: Number(d.amount),
      updatedAt: d.updatedAt,
      hasPdf: !!d.pdfFileKey,
    })),
  ]

  return rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

export function pdfUrlFor(type: DocumentRow['type'], id: string) {
  const slug = type === 'QUOTATION' ? 'quotation' : type === 'INVOICE' ? 'invoice' : type === 'SPK' ? 'spk' : 'nda'
  return `/api/documents/${slug}/${id}/pdf`
}

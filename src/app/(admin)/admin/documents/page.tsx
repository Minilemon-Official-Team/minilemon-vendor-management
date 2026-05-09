import { requireAdmin } from '@/lib/permissions'
import { listDocuments } from '@/queries/documents'
import { DocumentFilter } from '@/components/documents/DocumentFilter'
import { DocumentTable } from '@/components/documents/DocumentTable'

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; status?: string }>
}) {
  await requireAdmin()
  const params = await searchParams

  const rows = await listDocuments({
    type: (params.type as any) || 'all',
    q: params.q,
    status: params.status,
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink-900">Documents</h1>
        <p className="mt-1 text-sm text-ink-600">
          Cari dan unduh seluruh dokumen NDA, Quotation, SPK, dan Invoice.
        </p>
      </header>

      <DocumentFilter />
      <DocumentTable rows={rows} isAdmin />
    </div>
  )
}

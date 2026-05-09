import { requireVendor } from '@/lib/permissions'
import { listDocuments } from '@/queries/documents'
import { DocumentFilter } from '@/components/documents/DocumentFilter'
import { DocumentTable } from '@/components/documents/DocumentTable'

export default async function VendorDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; status?: string }>
}) {
  const session = await requireVendor()
  const params = await searchParams
  if (!session.user.vendorId) return null

  const rows = await listDocuments({
    vendorId: session.user.vendorId,
    type: (params.type as any) || 'all',
    q: params.q,
    status: params.status,
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink-900">Dokumen Saya</h1>
        <p className="mt-1 text-sm text-ink-600">Semua NDA, Quotation, SPK, dan Invoice Anda dalam satu halaman.</p>
      </header>

      <DocumentFilter />
      <DocumentTable rows={rows} isAdmin={false} />
    </div>
  )
}

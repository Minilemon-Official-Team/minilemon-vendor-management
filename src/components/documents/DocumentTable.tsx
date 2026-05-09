import Link from 'next/link'
import { Download, Eye } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { DocStatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileText } from 'lucide-react'
import { formatDate, formatIDR } from '@/lib/utils'
import { pdfUrlFor, type DocumentRow } from '@/queries/documents'

const typeLabel = {
  NDA: 'NDA',
  QUOTATION: 'Quotation',
  SPK: 'SPK',
  INVOICE: 'Invoice',
}

const typeBadgeColor: Record<DocumentRow['type'], string> = {
  NDA: 'bg-ink-100 text-ink-700',
  QUOTATION: 'bg-leaf-100 text-leaf-600',
  SPK: 'bg-lemon-100 text-ink-800',
  INVOICE: 'bg-coral-100 text-coral-600',
}

export function DocumentTable({
  rows,
  isAdmin,
}: {
  rows: DocumentRow[]
  isAdmin: boolean
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="Belum ada dokumen"
          description="Dokumen yang sudah dibuat atau ditandatangani akan muncul di sini."
        />
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/40 text-xs uppercase tracking-wide text-ink-500">
              <th className="text-left font-medium px-4 py-3">Tipe</th>
              <th className="text-left font-medium px-4 py-3">Doc Number</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              {isAdmin && <th className="text-left font-medium px-4 py-3">Vendor</th>}
              <th className="text-left font-medium px-4 py-3">Project</th>
              <th className="text-right font-medium px-4 py-3">Total</th>
              <th className="text-left font-medium px-4 py-3">Update</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((row) => {
              const pdfUrl = pdfUrlFor(row.type, row.id)
              return (
                <tr key={`${row.type}-${row.id}`} className="hover:bg-ink-50/40">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${typeBadgeColor[row.type]}`}
                    >
                      {typeLabel[row.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.docNumber}</td>
                  <td className="px-4 py-3">
                    <DocStatusBadge status={row.status} />
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-ink-700">
                      {row.vendorName}{' '}
                      <span className="text-xs text-ink-400">({row.vendorCode})</span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-ink-700">{row.projectName || '—'}</td>
                  <td className="px-4 py-3 text-right text-ink-700">
                    {row.amount !== null ? formatIDR(row.amount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500">{formatDate(row.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Link
                        href={pdfUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                      >
                        <Eye className="h-3 w-3" />
                        Lihat
                      </Link>
                      {row.hasPdf && (
                        <a
                          href={pdfUrl}
                          download
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

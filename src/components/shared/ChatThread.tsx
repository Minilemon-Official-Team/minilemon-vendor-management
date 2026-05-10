'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Send, Link2, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { sendChatMessage } from '@/actions/chat'
import { useToast } from '@/components/ui/Toast'
import { formatRelativeTime, cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  content: string | null
  driveLink: { url: string; title: string } | null
  createdAt: string
  sender: { id: string; fullName: string; role: 'ADMIN' | 'VENDOR' }
}

export function ChatThread({ projectId }: { projectId: string }) {
  const { data: session } = useSession()
  const { showToast } = useToast()
  const [content, setContent] = useState('')
  const [driveLinkOpen, setDriveLinkOpen] = useState(false)
  const [driveUrl, setDriveUrl] = useState('')
  const [driveTitle, setDriveTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, refetch } = useQuery({
    queryKey: ['chat', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/${projectId}`)
      if (!res.ok) throw new Error('Failed to load chat')
      return (await res.json()) as { data: ChatMessage[] }
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  })

  const messages = data?.data ?? []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  function handleSend() {
    const hasContent = content.trim().length > 0
    const hasLink = driveUrl.trim().length > 0
    if (!hasContent && !hasLink) return

    startTransition(async () => {
      const result = await sendChatMessage(projectId, {
        content: hasContent ? content.trim() : undefined,
        driveLinkUrl: hasLink ? driveUrl.trim() : undefined,
        driveLinkTitle: hasLink ? driveTitle.trim() : undefined,
      })
      if (!result.ok) {
        showToast(result.error, 'error')
        return
      }
      setContent('')
      setDriveUrl('')
      setDriveTitle('')
      setDriveLinkOpen(false)
      refetch()
    })
  }

  return (
    <div className="flex flex-col h-[60vh] min-h-[400px] bg-white rounded-xl border border-ink-100 shadow-soft">
      <div className="px-5 py-3 border-b border-ink-100">
        <h3 className="font-display font-semibold text-ink-900">Diskusi Project</h3>
        <p className="text-xs text-ink-500">Update otomatis setiap 5 detik</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-ink-400 italic mt-8">
            Belum ada pesan. Mulai diskusi dengan vendor.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender.id === session?.user.id
            return (
              <div key={m.id} className={cn('flex gap-2', mine && 'flex-row-reverse')}>
                <Avatar name={m.sender.fullName} size="sm" />
                <div className={cn('max-w-[75%] space-y-1', mine && 'items-end flex flex-col')}>
                  <div
                    className={cn(
                      'rounded-2xl px-3 py-2 text-sm',
                      mine ? 'bg-ink-900 text-lemon-400' : 'bg-ink-50 text-ink-800',
                    )}
                  >
                    {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                    {m.driveLink && (
                      <a
                        href={m.driveLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'mt-1 flex items-center gap-1.5 text-xs underline underline-offset-2',
                          mine ? 'text-lemon-300' : 'text-leaf-600',
                        )}
                      >
                        <Link2 className="h-3 w-3" />
                        {m.driveLink.title || m.driveLink.url}
                      </a>
                    )}
                  </div>
                  <p className="text-[10px] text-ink-400 px-1">
                    {m.sender.fullName} · {formatRelativeTime(m.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-ink-100 p-3 space-y-2">
        {driveLinkOpen && (
          <div className="rounded-lg border border-ink-200 bg-ink-50/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-700">Tautan Google Drive / lainnya</p>
              <button
                type="button"
                onClick={() => {
                  setDriveLinkOpen(false)
                  setDriveUrl('')
                  setDriveTitle('')
                }}
                className="text-ink-500 hover:text-ink-800"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full h-8 rounded border border-ink-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            />
            <input
              type="text"
              value={driveTitle}
              onChange={(e) => setDriveTitle(e.target.value)}
              placeholder="Judul tautan (opsional)"
              className="w-full h-8 rounded border border-ink-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            />
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Tulis pesan... (Enter untuk kirim, Shift+Enter baris baru)"
            className="flex-1 resize-none rounded-lg border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            disabled={isPending}
          />
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setDriveLinkOpen((s) => !s)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border',
                driveLinkOpen ? 'bg-ink-900 text-lemon-400 border-ink-900' : 'border-ink-200 text-ink-600 hover:bg-ink-50',
              )}
              aria-label="Tambahkan tautan"
            >
              <Link2 className="h-4 w-4" />
            </button>
            <Button onClick={handleSend} loading={isPending} size="sm" className="h-9 w-9 p-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

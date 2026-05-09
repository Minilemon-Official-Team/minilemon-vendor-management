import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getSignedDownloadUrl, s3ObjectExists } from '@/lib/s3'

const schema = z.object({
  fileKey: z.string().min(1),
})

function isOwnedKey(fileKey: string, userId: string, role: string): boolean {
  if (role === 'ADMIN') {
    return (
      fileKey.startsWith(`signatures/${userId}/`) ||
      fileKey.startsWith('company/')
    )
  }
  return (
    fileKey.startsWith(`ktp/${userId}/`) ||
    fileKey.startsWith(`signatures/${userId}/`)
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  if (!isOwnedKey(parsed.data.fileKey, session.user.id, session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const exists = await s3ObjectExists(parsed.data.fileKey)
  if (!exists) {
    return NextResponse.json({ error: 'File belum terupload' }, { status: 400 })
  }

  const url = await getSignedDownloadUrl(parsed.data.fileKey, 3600)
  return NextResponse.json({ url })
}

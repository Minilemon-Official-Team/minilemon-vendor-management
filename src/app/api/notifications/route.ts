import { auth } from '@/lib/auth'
import { listUserNotifications } from '@/queries/notifications'

export async function GET() {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const result = await listUserNotifications(session.user.id)
  return Response.json(result)
}

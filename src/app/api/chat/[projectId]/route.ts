import { auth } from '@/lib/auth'
import { getProjectAccessInfo, listChatMessages } from '@/queries/chat'

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await auth()
  if (!session?.user) return new Response('Unauthorized', { status: 401 })

  const { projectId } = await params
  const project = await getProjectAccessInfo(projectId)
  if (!project) return new Response('Not found', { status: 404 })
  if (session.user.role !== 'ADMIN' && project.vendorId !== session.user.vendorId) {
    return new Response('Forbidden', { status: 403 })
  }

  const url = new URL(req.url)
  const sinceParam = url.searchParams.get('since')
  const since = sinceParam ? new Date(sinceParam) : undefined

  const data = await listChatMessages(projectId, since)
  return Response.json({ data })
}

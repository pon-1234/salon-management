/**
 * @design_doc   Next 15 dynamic route params contract
 * @related_to   app/(admin)/admin/cast/manage/[id]/page.tsx: canonical cast detail editor
 * @known_issues Redirect-only route kept for legacy admin cast detail links
 */
import { redirect } from 'next/navigation'

export default async function CastDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/cast/manage/${id}`)
}

import { redirect } from 'next/navigation'

export default async function CastDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/cast/manage/${id}`)
}
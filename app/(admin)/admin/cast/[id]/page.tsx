import { redirect } from 'next/navigation'

export default async function CastDetailRedirect({ params }: { params: { id: string } }) {
  const { id } = params
  redirect(`/admin/cast/manage/${id}`)
}

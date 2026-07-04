/**
 * @design_doc   ui-improvement-instructions.md U-12 store route metadata/runtime contract
 * @related_to   CastLoginForm: store-scoped cast portal sign-in surface
 * @known_issues This page has no store-specific metadata beyond the parent layout
 */
import { CastLoginForm } from '@/components/cast-portal/login-form'

export default async function StoreCastLoginPage({
  params,
}: {
  params: Promise<{ store: string }>
}) {
  const { store } = await params

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <CastLoginForm storeSlug={store} />
    </div>
  )
}

/**
 * @design_doc   Preview UAT must remain visually distinct and disclose only validated snapshot metadata
 * @related_to   app/layout.tsx, lib/config/env.ts, upstream preview access gateway
 * @known_issues The deployment gateway remains responsible for protecting reverse-proxy-served uploads
 */
interface PreviewEnvironmentBannerProps {
  runtimeMode: 'live' | 'preview'
  snapshotCutoff: string | null
}

export function PreviewEnvironmentBanner({
  runtimeMode,
  snapshotCutoff,
}: PreviewEnvironmentBannerProps) {
  if (runtimeMode !== 'preview') return null

  return (
    <aside
      aria-label="確認環境"
      role="status"
      className="sticky top-0 z-[100] flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-700 bg-amber-300 px-4 py-2 text-center text-sm font-bold text-black shadow-md"
      style={{ position: 'sticky' }}
    >
      <span>確認環境</span>
      <span>この環境のデータは予告なく初期化されます。確認用途にのみ使用してください。</span>
      {snapshotCutoff ? (
        <>
          <span>
            データ基準日時: <time dateTime={snapshotCutoff}>{snapshotCutoff}</time>
          </span>
          <span>移行内容は確認中で、本番切替は未承認です。</span>
        </>
      ) : (
        <span>確認用データはまだ投入されていません。</span>
      )}
    </aside>
  )
}

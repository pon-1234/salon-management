# UX foundations

This document records the cross-application UI decisions made while resolving the 2026-07-26
system audit.

## Theme strategy

- The admin application uses the shadcn semantic tokens defined in `styles/globals.css`.
- Public storefront routes apply their black-and-gold token values in `app/[store]/layout.tsx`.
- Runtime theme switching is intentionally unsupported. The unused `next-themes` dependency,
  provider, `.dark` variables, and `dark:` variants were removed.
- Shared components must use semantic tokens. Storefront-only components may use the documented
  `luxury-*` palette.

## Shared interaction patterns

- `PageLoading` is the page or permission-boundary loading state.
- `TableSkeleton` is the loading state for administrative lists.
- Destructive actions use `ConfirmDialog`; validation feedback uses the toast system.
- Header and navigation actions must provide a minimum 44px touch target.
- The admin shell is `h-dvh` with a sticky header and a `flex-1 min-h-0` main pane.
  Chat and analytics fill that remaining height instead of using a hardcoded header offset.
- The current admin destination uses `aria-current="page"`. Daily reservation work uses
  予約表 (`/admin/reservation`) next to 予約一覧.
- Long administrative forms use `useUnsavedChangesWarning` where losing edits would be costly.

## Printing

Global print rules hide elements marked `print-hidden`, buttons, and popover content; remove sticky
positioning; and avoid breaking rows, images, and cards across pages. Analytics screens use the
shared `PrintButton` so future print behavior can be updated in one place.

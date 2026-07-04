# UI Improvement Instructions — salon-management

> この文書は実装担当モデルへの指示書である。目的は「**誰でも使いやすいUI**」— 操作の結果が必ず見える、迷わず辿り着ける、スマホでも使える、読める・押せる・キーボードでも操作できる状態にすること。
> `refactor-instructions.md`(コード負債の指示書)の姉妹文書であり、**同じ Non-Negotiables・検証規律に従う**。
> 作成日: 2026-07-04。3方向のUI監査(管理画面 / 顧客・キャスト向け / アクセシビリティ・デザインシステム)の証拠に基づく。

---

## 1. Objective

1. **配線ミスの修正**: 実装済みなのに動いていないUI基盤(トースト通知、luxuryテーマCSS)を接続する
2. **嘘をつくUIの排除**: 押しても何も起きないボタン、偽のページネーション、デモ認証情報の表示、固定の架空統計を直す
3. **フィードバックの保証**: すべての保存・削除・失敗がユーザーに見えるようにする(トースト、確認ダイアログ、loading/error/empty状態)
4. **導線の完成**: 全ページにナビから到達でき、現在地がわかるようにする
5. **アクセシビリティの底上げ**: スクリーンリーダー・キーボード・低視力・スマホユーザーが使える状態にする
6. **一貫性**: 通貨・日付表示、フォーム検証、色トークンを統一する

**ビジュアルデザインの方向性(ダーク×ゴールドのluxuryテーマ)は変更しない。** 目的は「意図されたデザインを正しく動かすこと」であり、リデザインではない。

---

## 2. 前提と実行順序

- **`refactor-instructions.md` の Phase 0(ベースライン)を先に実施していること**。未実施ならこの文書でも同じ Phase 0 を最初に行う。
- refactor 側の Phase 5(reservation-dialog 等の分割)と本文書は同じファイルに触れる。**同時に進めない**こと。推奨順: refactor Phase 0–4 → 本文書 U1–U7 → refactor Phase 5–7。人間から別指定があればそれに従う。
- refactor-instructions.md の §4 Non-Negotiables と §5 Stop And Ask Conditions は**本文書にもそのまま適用される**。追加の禁止事項: §4、追加の確認事項: §9。

## 3. Behaviors To Preserve(壊してはいけないもの)

1. 予約フローのビジネスロジック(空き状況取得、AbortControllerによるキャンセル、二重送信ガード `disableBooking`、STEP間の入力保持)。
2. 認証フローの挙動(メール列挙攻撃対策 — `forgot-password-form.tsx` は失敗時も成功表示する。これは意図的なセキュリティUXであり「直さない」)。
3. luxuryテーマの視覚的方向性(ゴールド×ダーク、`[store]/layout.tsx` のインラインCSS変数)。
4. 既存の優良パターン(これらを**基準として他に展開する**):
   - `app/(admin)/admin/analytics/layout.tsx` のローディング+権限拒否Alert
   - `components/cast-portal/dashboard-content.tsx` / `settlements-content.tsx` の useTransition・EmptyState・大きなタッチターゲット
   - `components/mypage/mypage-content.tsx` の skeleton・error・empty状態
   - RHF+Zod の顧客フォーム(`customers/new/new-customer-content.tsx` 等)と日本語インラインエラー
   - `store-schedule-content.tsx` の `overflow-x-auto` + `min-w` によるテーブルのモバイル対応
5. 日本語のUI文言(勝手に英語化しない。新規文言も日本語)。

## 4. Non-Negotiables(refactor版に加えて)

- 新規依存パッケージを追加しない(shadcn/ui の未導入コンポーネント生成は既存依存の範囲なので可)。**未使用の `sonner` の削除は許可**(package.json から除去し、`pnpm install` でlockfile更新。それ以外の依存は触らない)。
- レイアウト・配色の「好みによる変更」をしない。変更はすべて本文書の負債項目に紐づくこと。
- 文言・ラベルの意味を変えない(表記の統一は可)。
- 機能の新規追加をしない(死んだUIを「機能させる」ことは修理であり可。§9 の判断基準に従う)。
- 1コミット1論理変更。無関係な整形をしない。

## 5. Baseline & UI検証の方法

コード検証は refactor 版 §6/§10 と同一(`pnpm typecheck && pnpm test run` を各コミット後、フェーズ末に lint/build 追加)。加えてUI変更には**目視検証**を必須とする:

```bash
pnpm dev   # http://localhost:3000
```

- 各フェーズの「検証チェックリスト」(各項目に記載)を dev サーバーで実際に操作して確認し、結果を報告に記す。
- DBが無い環境では `USE_MOCK_FALLBACK=true`(既定で非productionはtrue)でモックデータ表示を利用してよい。
- 確認する代表ページ: `/`(ポータル)、`/ikebukuro`(店舗トップ)、`/ikebukuro/booking`、`/ikebukuro/cast`、`/ikebukuro/login`、`/admin/login` → `/admin/dashboard`、`/admin/customers`、`/admin/settings/store-info`、`/admin/analytics/daily-sales`、`/cast/login` → `/cast/dashboard`。
- 可能ならブラウザ幅 375px(スマホ)/ 768px / 1280px の3段階で確認する。

---

## 6. UI Debt Map

優先度: 🔴 = 使えない/嘘をつくUI、🟡 = 大きな不便、🟢 = 品質向上。
各項目に検証方法を付す。**[実装可]** が原則、判断が要るものは §9 を参照。

### U-1 🔴 トースト通知が一切表示されない **[実装可]**

- **証拠**: `toast()` 呼び出しは39ファイル・約184箇所(例: `app/(admin)/admin/settings/store-info/page.tsx:117-123` の「店舗情報を保存しました」)。しかし `<Toaster>` / `<ToastViewport>` のマウント箇所は**リポジトリ全体でゼロ**(検証済み)。`components/ui/toaster.tsx` 自体が存在しない。さらに `hooks/use-toast.ts` と `components/ui/use-toast.ts` の**2つの実装が並存**(30ファイル vs 9ファイルが別々をimport)。`sonner` はインストール済みだが利用ゼロ。
- **影響**: 全画面で保存成功・エラーのフィードバックが無音。失敗の多くは `console.error` のみ(例: `app/(admin)/admin/customers/page.tsx:33`)。
- **修正**: (1) shadcn 標準の `components/ui/toaster.tsx` を作成し、`app/layout.tsx` にマウント(全ロールのレイアウトに効く位置)。(2) use-toast を `hooks/use-toast.ts` に一本化し、`components/ui/use-toast.ts` は同 hooks を re-export するだけにするか、全importを書き換えて削除。(3) `TOAST_LIMIT = 1`(`hooks/use-toast.ts:8`)を 3 程度に引き上げ。(4) `sonner` を依存から削除。
- **検証**: 管理画面の任意の設定保存でトーストが表示されること。dev tools でエラーを起こし(APIをオフラインにする等)エラートーストが出ること。既存テストがモックしている場合はテストの green を維持。

### U-2 🔴 luxuryテーマCSSが読み込まれていない **[実装可]**

- **証拠**: `app/layout.tsx:3` は `styles/globals.css` をimport。luxuryクラス定義(`.luxury-body`/`.luxury-panel`/`.luxury-display` 等、35ルール)は **`app/globals.css` にのみ存在し、どこからもimportされていない**(検証済み。参照は `vitest.config.ts:35` の除外設定のみ)。一方 `luxury-*` クラスの利用は**101箇所**。`components.json` は `"css": "app/globals.css"` を指しておりimportと不整合。
- **影響**: 予約ページの `bg-white` 12箇所(`store-booking-content.tsx:512,545,551,617,715,810,874,965` 等)が「白背景に金文字」のコントラスト崩壊。`.luxury-display` の書体、`.luxury-panel` の背景・枠が全て無効。`register-form.tsx:357,361,380` のリンクが意図に反して青のまま。
- **修正**: (1) `app/globals.css` の luxury 関連ルールを、**読み込まれている** `styles/globals.css` へ移設する(逆にimportを差し替える案は不可 — 2ファイルはトークン定義が食い違っており、現在の見た目のベースは styles 側)。(2) `app/globals.css:1` の Google Fonts `@import`(Cinzel / Noto Serif JP)は移設**しない** — 代わりに `next/font/google` で該当フォントを読み込み、CSS変数で `.luxury-display` 等に当てる(root layout は既に next/font で Noto Sans JP / Playfair を読み込んでいる。その流儀に合わせる)。(3) 移設完了後、`app/globals.css` を削除し `components.json` の css パスを `styles/globals.css` に修正、`vitest.config.ts` の除外も更新。
- **注意**: このフェーズは**見た目が大きく変わる**(それが意図: コミット `cdcc1a5`/`6490f3b` のリデザインが初めて完全に効く)。`.luxury-body .bg-white → ダーク` 等の上書きが効き始めるため、店舗系全ページを目視確認し、想定外の崩れ(管理画面への波及が無いこと — `.luxury-body` スコープ外であること)を確認する。
- **検証**: `/ikebukuro/booking` で白ブロックが消えダークパネルになること。`/ikebukuro` の見出しがディスプレイ書体になること。`/admin/dashboard` の見た目が**変わらない**こと。幅375pxでも確認。

### U-3 🔴 嘘をつくUI(押せるのに何も起きない/偽の表示)**[実装可、§9の基準で]**

- **証拠と修正**:
  1. `app/[store]/cast/page.tsx:51-87` — フィルタボタン5個(すべて/新人/本日出勤/指名上位/ネット予約可)が**無機能**。→ §9-A の基準で「実装 or 除去」。
  2. `app/[store]/cast/page.tsx:201-237` — **偽のページネーション**(「2」が常にアクティブ、ロジックなし)。→ 実データの件数に基づく実装に置換。1ページに収まる間はコントロール自体を非表示。
  3. `components/store-home-content.tsx:127-133` — ヒーローの「今すぐ予約」ボタンが**無反応**(href/onClickなし)。→ `/[store]/booking` へのリンクにする。
  4. `components/store-home-content.tsx:38-42,158-160` — 架空の固定統計(在籍150+/平均評価4.8/24H)が全店舗に表示。→ 実データから導出できるもの(在籍数=公開キャスト数、評価=公開レビュー平均)は実データ化し、導出できない項目はブロックごと非表示。
  5. `components/auth/login-form.tsx:94-102` — **デモ用ログイン情報(メール/パスワード)が本番顧客ログイン画面に常時表示**。→ 削除(refactor版 D-8「デモログイン不要」の決定と整合)。
  6. `components/auth/login-form.tsx:179,188` — SNSログインボタンが `alert('準備中です')`。→ ボタンを `disabled` + 「準備中」バッジ表示に変更するか除去(§9-B)。
  7. `app/page.tsx:10` — ポータルの「【女性求人】」リンクの遷移先 `/[store]/recruitment` は求人ではなく新人紹介ページ。→ §9-C。
- **検証**: 各修正箇所を実際にクリックして期待動作を確認。キャスト一覧はフィルタ適用結果とページ送りを目視。

### U-4 🔴 破壊的操作の確認が `window.confirm` **[実装可]**

- **証拠**: 削除確認がブラウザネイティブの `confirm()`: `settings/designation-fees/page.tsx:184`、`settings/station-info/page.tsx:256`、`settings/course-info/page.tsx:248`、`settings/area-info/page.tsx:198`、`settings/option-info/page.tsx:213`、`settings/hotel-info/page.tsx:134`、`settings/admin-info/page.tsx:268`、`reviews/page.tsx:108`、`components/admin/point-expiration-panel.tsx:12`。shadcn `AlertDialog` の利用は実質1箇所のみ。
- **修正**: 共通の確認ダイアログコンポーネント(`components/shared/confirm-dialog.tsx` 等、AlertDialogベース、削除対象名を表示、破壊ボタンは `variant="destructive"`)を1つ作り、上記9箇所を順次置換。1コミット1〜2ページ。
- **検証**: 各削除操作で確認ダイアログ→キャンセル/実行の両経路を確認。

### U-5 🟡 loading / error / not-found 規約ファイルがゼロ **[実装可]**

- **証拠**: `app/` 配下に `loading.tsx` 0件、`error.tsx` 0件、`not-found.tsx` 0件。`components/ui/skeleton.tsx` は存在するが機能コードでの利用0件。ローディング表現は「読み込み中...」テキスト/`Loader2`/なし、の3流派が混在。
- **修正**: (1) ルートグループ単位で `error.tsx`(日本語メッセージ+再試行ボタン)と `not-found.tsx` を追加: `app/`直下、`app/(admin)/`、`app/[store]/`、`app/cast/` の4系統。(2) データ取得が重い代表ルート(`/admin/customers`、`/admin/dashboard`、`/[store]/cast`、`/cast/dashboard`)に `loading.tsx` または skeleton を追加。(3) クライアント側フェッチのページは「読み込み中テキスト」を skeleton か `Loader2` パターン(analytics layout 流)に順次統一 — 全ページ一括ではなく**代表10ページ**から。
- **検証**: 存在しない `/ikebukuro/cast/存在しないID` 等で not-found 表示。dev で throw を仕込み error.tsx の表示と再試行を確認(確認後、仕込みは除去)。

### U-6 🟡 管理画面ナビゲーションの欠陥 **[実装可]**

- **証拠**: `components/header.tsx:116` — 唯一のナビが折り返し無しの固定横並び(約11要素)で、狭い幅で溢れる。モバイルメニューなし。**`/admin/reviews` と `/admin/search` へのリンクが存在しない**。`components/analytics/layout.tsx:4-60` のサイドバーに `daily-report` と `payment-status` の項目が無く、`:66-72` に現在地ハイライトも無い(`usePathname` 未使用)。パンくず・ページタイトルの一貫した仕組みなし。
- **修正**: (1) header に `md` 未満で Sheet(ハンバーガー)メニューを追加し、全主要リンク(reviews / search 含む)を収録。デスクトップは既存構成+溢れ対策(優先度低のリンクをドロップダウンへ)。(2) analytics サイドバーに不足2項目を追加し、`usePathname` でアクティブ表示。(3) ページタイトル: 全adminページ共通の `PageHeader` コンポーネント(タイトル+任意の戻るリンク)を作り、まず settings 配下と orphan ページに適用。
- **検証**: 幅375pxで管理画面ナビが操作可能。reviews / search / daily-report / payment-status にナビ経由で到達可能。分析サイドバーで現在のレポートが視覚的に判別可能。

### U-7 🟡 モバイルで電話・ログインに到達できない(店舗ページ)**[実装可]**

- **証拠**: `components/store-navigation.tsx` — 電話番号ブロック(`:120`)と 会員登録/ログイン/マイページ(`:73-109`)が `hidden sm:flex`。モバイルの Sheet メニュー(`:149-190`)にはナビリンクとログインのみで**電話番号が無い**。電話を含む `FloatingQuickNav` も `hidden lg:flex`(`store-home-content.tsx:451`)。
- **修正**: モバイル Sheet に電話番号(`tel:` リンク、営業時間併記)とマイページ/会員登録の導線を追加。またはモバイル下部固定バー(電話・予約)を追加 — 実装は Sheet 追加を優先(小さい差分)。
- **検証**: 幅375pxで店舗ページから2タップ以内に電話発信リンクへ到達できること。

### U-8 🟡 ログインリダイレクトのパラメータ不整合 **[実装可]**

- **証拠**: `components/store-schedule-content.tsx:116` は未ログイン者を `/login?redirect=<予約パス>` へ送るが、`components/auth/login-form.tsx:74` は `callbackUrl` しか読まない。選んだキャスト・時間帯が消えて `/mypage` に着地する。
- **修正**: 送る側を `callbackUrl` に統一(受け側は変更しない — NextAuth の慣例に合わせる)。他に `?redirect=` を発行している箇所が無いか grep で確認し、あれば同様に統一。`callbackUrl` の値は相対パスのみ許可(オープンリダイレクト防止 — 受け側の検証ロジックを確認し、無ければ相対パス検証を追加)。
- **検証**: 未ログインでスケジュールの時間枠クリック → ログイン → 選択済みキャスト・時間入りの予約ページに戻ること。

### U-9 🟡 アイコンボタンにアクセシブルネームが無い **[実装可]**

- **証拠**: `<Button size="icon">` 35箇所、`aria-label` 付与 0箇所(例: `settings/store-info/page.tsx:159` の戻る矢印)。admin settings 全体で `aria-label` 2箇所のみ。`tabIndex` はリポジトリ全体で0箇所、`role=` は3箇所 — クリック可能な非ボタン要素(カード・行)はキーボード操作不能。
- **修正**: (1) 全 `size="icon"` ボタンに日本語の `aria-label` を付与(「戻る」「削除」「編集」等)。機械的に列挙 → 1コミットで一括可。(2) クリック可能な div/カードは `<button>` / `<Link>` への置換を基本とし、構造上困難な場合のみ `role="button"` + `tabIndex={0}` + Enter/Space ハンドラ。まず顧客導線(キャストカード、予約スロット)と admin 一覧行から。
- **検証**: Tabキーだけで店舗トップ→キャスト選択→予約ページまで到達できること。

### U-10 🟡 通貨・日付表示の不統一 **[実装可]**

- **証拠**: `lib/shared/utils.ts:5` の `formatCurrency` は**¥記号を付けない**ため各所が手動で `¥` を前置(リテラル `¥` 242箇所、生 `toLocaleString` 370箇所、shared利用は52箇所のみ)。`lib/reservation/transformers.ts:125` は `円` 後置で流儀が混在。日付も date-fns `format` 133箇所 vs `toLocaleDateString` 10箇所。
- **修正**: (1) `formatCurrency` を `¥1,234` 形式を返すよう変更…は**既存52呼び出しの表示が変わるため不可**。代わりに `formatYen(amount): string`(¥前置)を `lib/shared/utils.ts` に追加し、**新規・変更コードから採用**。(2) リテラル `¥${...toLocaleString()}` の置換はホットスポット(dashboard、analytics各ページ、customers/[id])から1ファイル単位で実施。`円` 後置は表示文言の仕様変更になるため触らない(§9-D)。(3) `toLocaleDateString` 10箇所を date-fns `format` + ja ロケールに統一。
- **検証**: 置換したページで金額表示が従前と同一文字列であることを目視比較。

### U-11 🟡 フォーム検証の二流派 **[実装可、段階的]**

- **証拠**: RHF+Zod+日本語インラインエラーは4surface のみ(customers/new ほか)。`components/cast/cast-form.tsx`(976行)は `useState` + HTML `required` のみで検証メッセージ無し(`:489,501`)。settings 系フォームもすべて ad-hoc `useState`。必須マーク(\*)の表示規約なし。
- **修正**: (1) `components/ui/form.tsx`(既存のRHF+Zodラッパー)を標準と定める。(2) まず **cast-form.tsx** を RHF+Zod 化(最大かつ利用頻度の高いフォーム。Zodスキーマは既存のHTML required と現行の送信payloadから起こし、**検証を厳しくしすぎない** — 現在通る入力は通ること)。(3) settings フォームは1ページ1コミットで順次(store-info → admin-info → …)。(4) 必須項目にはラベル横に `<span aria-hidden>*</span>` + フィールドの `aria-required` を規約化。(5) パスワード入力に表示/非表示トグルを追加(login/register/reset共通)。
- **検証**: 各フォームで「空送信 → 日本語のインラインエラー」「正常送信 → トースト(U-1修正後)」を確認。既存の正常系入力が引き続き通ること。

### U-12 🟡 ページメタデータの欠落 **[実装可]**

- **証拠**: `metadata` があるのは71ページ中 root layout の1件のみ。42ページが `"use client"` で `export const metadata` 不可。`viewport`/`themeColor` 設定なし。`app/layout.tsx:22` に `generator: 'v0.dev'` が残存。
- **修正**: (1) 各**layout**(`(admin)`、`[store]`、`cast`)に `title.template`(例: `%s | 管理画面`)を設定。(2) 主要ページ(店舗トップ、キャスト一覧・詳細、料金、予約、ログイン、admin主要ページ)に title を付与 — client ページは薄いサーバー `page.tsx` + client 子コンポーネントへ分離するのが正攻法だが、**分離はUI挙動に影響し得るため、まず layout の template + サーバーコンポーネントである店舗系ページへの付与に留める**。client ページの分離は §9-E。(3) `generator: 'v0.dev'` を削除、`viewport` と `themeColor`(ダーク系)を root layout に追加。
- **検証**: ブラウザタブのタイトルがページごとに変わること。

### U-13 🟢 色トークン化(ハードコードhexの削減)**[実装可、最後に]**

- **証拠**: 任意値hexが約686箇所(`text-[#...]` 380 / `bg-[#...]` 151 / `border-[#...]` 140 / グラデ15)。ゴールド(`#d7b46a`、`#f3d08a` 等)が26ファイルに直書き。ホットスポット: `store-home-content.tsx`(51)、`store-booking-content.tsx`(42)、`[store]/ranking`(39)ほか。
- **修正**: (1) `tailwind.config.ts` に `gold`(50〜900段階、実際に使われているhexから採番)等のブランドトークンを追加。(2) ホットスポット上位5ファイルから、**同一hex→同一トークンの機械的置換のみ**を1ファイル1コミットで実施(色値を「改善」しない — 変換前後でコンパイル結果の色が同一であること)。全686箇所の完遂は求めない — 上位10ファイル+新規コードの規約化で十分。
- **検証**: 置換ページのスクリーンショット前後比較で視覚差ゼロ。

### U-14 🟢 その他のアクセシビリティ・モバイル品質 **[実装可]**

- 状態が色のみで伝わる箇所: `reservation-dialog.tsx:237` のカレンダードット等 → 既存の `statusTextMap`(`:143`)を使いツールチップ/テキスト併記。
- `text-[10px]`〜`text-[13px]` 53箇所 → 12px未満は原則 `text-xs`(12px)へ引き上げ(バッジ等で崩れる場合は据え置き可、判断をコミットメッセージに記す)。
- タッチターゲット: `store-schedule-content.tsx:329` の36px円 → 44px相当へ(`h-11 w-11`)。cast-portal ナビの横スクロールにスクロール示唆(フェード)追加。
- `campaign-banner-slider.tsx`: フォーカス/タッチでの自動再生停止、`prefers-reduced-motion` 対応、ドットを大きく(`:145`)。
- `components/cast/cast-detail-content.tsx` の手製モーダル → `components/ui/dialog.tsx` に置換(フォーカストラップ/Esc/aria-modal を得る)。
- `components/cast-portal/login-form.tsx:43-44` — NextAuth の生エラーコード表示 → 顧客ログイン(`login-form.tsx:71`)と同じ日本語マッピングに統一。
- `verify-phone-form.tsx` — コード入力に `inputMode="numeric"` + `maxLength={6}`、再送信に60秒クールダウン表示。
- `login-form.tsx:54-56` / `register-form.tsx:100-103` — render中の `router.push` を `useEffect` へ移動。

### U-15 🟢 ダイアログの入力破棄ガード **[実装可]**

- **証拠**: `reservation-dialog.tsx:1662-1668` / `quick-booking-dialog.tsx:1107` — 編集途中でも Escape/外側クリックで無警告破棄。
- **修正**: フォームが dirty のとき、閉じる操作で「編集内容を破棄しますか?」の AlertDialog(U-4 の共通コンポーネント)を挟む。dirty 判定は既存フォーム state から導出。
- **検証**: 編集開始 → Escape → 確認ダイアログ → 「破棄」「戻る」両経路。未編集時は従来どおり即閉じ。

---

## 7. Implementation Phases(この順序で実施)

各フェーズ末に refactor 版 §10 のコマンド検証+本文書 §5 の目視チェックリストを実施。

- **Phase U0** — ベースライン(refactor Phase 0 と共通)+ 修正前の代表ページのスクリーンショット取得(§5 の代表ページ×幅375/1280。以後の比較基準)。
- **Phase U1 — 配線修正(最小差分・最大効果)**: U-1(Toaster + hook統一 + sonner削除)→ U-2(luxury CSS移設)。それぞれ独立コミット。U-2 は目視確認を特に厳密に。
- **Phase U2 — 嘘UIの排除**: U-3 の 7項目(§9 の判断基準に従う)。
- **Phase U3 — フィードバック統一**: U-4(確認ダイアログ)→ U-5(error/not-found/loading 規約ファイル、代表ページの skeleton 化)→ U-15(破棄ガード)。
- **Phase U4 — 導線**: U-6(adminナビ)→ U-7(モバイル電話導線)→ U-8(callbackUrl統一)→ U-12(メタデータ)。
- **Phase U5 — フォーム**: U-11(cast-form → settings 順)。
- **Phase U6 — アクセシビリティ**: U-9(aria-label一括 → キーボード操作)→ U-14 の各項目。
- **Phase U7 — 一貫性(最後)**: U-10(通貨・日付)→ U-13(トークン化、上位ファイルのみ)。
- **Phase U8 — 提案のみ(実装しない)**: 以下を `docs/ui-proposals.md` にまとめる:
  - 予約フローのステップ順見直し(現状: 時間選択がコース選択より先のため、コース変更で選択済み時間が無効化され得る — `store-booking-content.tsx:280-324`。順序変更はUX仕様の変更なので提案)
  - 予約成功後の確認ページ遷移と再送信ウィンドウの完全封鎖(現状はトースト+インライン表示のみ)
  - 年齢確認ゲートの方針(有効期限、対象ページ、離脱先 — 法務/プロダクト判断)
  - ダークモード対応の是非(next-themes は未配線。配線するか、`components/theme-provider.tsx` を削除するか)
  - `next/image` への移行(`images.unoptimized: true` の解除と合わせて — パフォーマンス改善だが検証コストが高い)
  - client ページのサーバーラッパー分離によるメタデータ完全化(§9-E)
  - E2Eテスト(Playwright)導入 — UI回帰を自動検知する仕組みが現状存在しない

## 8. Verification & Reporting

- コード検証: refactor 版 §10 と同一(ベースライン比悪化ゼロ、テスト件数減少なし)。
- UI検証: 各フェーズの検証チェックリスト結果を「操作 → 期待 → 実際」の形式で報告。
- Phase U0 と各フェーズ後のスクリーンショットを比較し、**意図した変更以外の視覚差分が無い**ことを確認(U-2 は例外 — 意図された大きな変化。変化内容を列挙して報告)。
- 報告書式は refactor 版 §11 と同一。最終報告に「修正した負債項目一覧(U-1〜U-15 の消化状況)」と `docs/ui-proposals.md` のパスを含める。

## 9. 判断基準と確認事項

以下は推奨デフォルトを定める。**人間から別指示が無い限りデフォルトを適用**し、適用結果を報告に明記する。デフォルトで判断できない事態が生じたら停止して質問。

- **A(キャスト一覧フィルタ)**: `Cast` モデル/公開プロフィールに対応するデータ(新人フラグ、本日出勤、指名数、ネット予約可)が**既にある**フィルタのみ実装し、データが無いフィルタボタンは削除する。新しいフラグをDBに追加してまで実装しない。
- **B(SNSログインボタン)**: デフォルト = **削除**(準備中機能の露出はしない。実装予定が確定したら復活させる)。
- **C(求人リンク)**: デフォルト = ポータルのリンクラベルを実態に合わせ「新人情報」に変更(遷移先は変えない)。本物の求人ページが必要かはプロダクト判断のため提案に記載。
- **D(`円`後置表示)**: 触らない。表示仕様の変更はスコープ外。
- **E(clientページのサーバーラッパー分離)**: 本文書では**やらない**(挙動リスクの割に効果が薄い)。Phase U8 の提案のみ。
- **F(架空統計)**: 実データ導出が1日で実装できない項目は非表示にする(嘘の表示を残すくらいなら消す)。

## 10. Out-of-scope

- ビジュアルリデザイン、配色・ブランドの変更(luxuryテーマの「正常化」はスコープ内、変更はスコープ外)
- 新機能(求人ページ新設、SNSログイン実装、リアルタイム更新)
- DBスキーマ変更(フィルタ用フラグの追加を含む)
- `next/image` 移行・画像最適化(提案のみ)
- ダークモードの新規実装(提案のみ)
- E2Eテスト基盤の導入(提案のみ)
- refactor-instructions.md のスコープ(コード構造の負債はそちらで扱う)

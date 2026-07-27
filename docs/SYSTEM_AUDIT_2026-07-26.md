# システム全体監査レポート（UI/UX・機能・技術負債）

- 作成日: 2026-07-26
- 対象ブランチ: `codex/preserve-uncommitted-20260723` (a859cc2)
- 目的: Codex への改修依頼用の課題インベントリ

## 0. 現状の健全性サマリー

| 項目           | 結果                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| `tsc --noEmit` | ✅ エラーなし                                                                       |
| `next lint`    | ✅ 警告・エラーなし                                                                 |
| `vitest run`   | ✅ 242 ファイル / 2020 テスト 全パス                                                |
| カバレッジ     | statements 58.16% / branches 79.42% / functions 70.84% / lines 58.16%（閾値は 30%） |
| E2E テスト     | ❌ 未整備（Playwright 未設定）                                                      |
| ローカル起動   | ⚠️ 起動はするが DB 接続不可（後述 A-1）                                             |

静的品質ゲートは全部緑。**問題はゲートが見ていない領域（実行時・UI/UX・未実装機能）に集中している。**

---

## A. 🔴 動いていない / 壊れている

### A-1. ローカル開発 DB が死んでいる（最優先）

`pnpm dev` は起動するが、全 DB クエリが失敗する。

```
PrismaClientInitializationError:
Error querying the database: FATAL: (ENOTFOUND) tenant/user postgres.fhsifypzkudnckrybpst not found
```

- `.env` の `DATABASE_URL` が指す Supabase プロジェクト `fhsifypzkudnckrybpst` が存在しない（削除済みか無効）
- `GET /api/health` → **503** `{"database":"not_ready","storage":"not_ready","notifications":"not_ready","line":"disabled"}`
- ローカル Postgres を立てる手段がリポジトリにない（`docker-compose.yml` なし、README にも記載なし）

**依頼内容**: ローカル用 `docker-compose.yml`（Postgres + 初期化）と `.env.example` の整合、README への手順追記。リモート Supabase 依存をローカル開発から外す。

### A-2. `ensureStoreId` が try/catch の外にあり、モックフォールバックが効かない

`GET /api/course` と `GET /api/option` は公開エンドポイントなのに **本文なしの 500** を返す。

```
$ curl -i "http://localhost:3000/api/course?storeId=ikebukuro"
HTTP/1.1 500 Internal Server Error
（body 空）
```

原因は store 解決が try ブロックの外にあること:

- [app/api/course/route.ts:136](app/api/course/route.ts:136) — `const storeId = await ensureStoreId(...)` が 139 行目の `try {` より前
- [app/api/option/route.ts:276](app/api/option/route.ts:276) — 同じ
- [app/api/cast/route.ts:293](app/api/cast/route.ts:293) — 同じ
- [app/api/designation-fee/route.ts:111](app/api/designation-fee/route.ts:111) — GET
- [app/api/designation-fee/route.ts:223](app/api/designation-fee/route.ts:223) — DELETE

`ensureStoreId` は内部で `storeExists()`（DB クエリ）を呼び、未知の店舗 slug でも `throw new Error('Unknown store: ...')` する（[lib/store/server.ts](lib/store/server.ts)）。結果:

1. DB 障害時に `buildFallbackCourseResponse` などのモックフォールバックが**一切実行されない**
2. **存在しない店舗 slug が 404 ではなく 500** になる（API 契約バグ。DB が生きていても再現する）

**依頼内容**: 5 箇所の `ensureStoreId` を try 内へ移動。`Unknown store` は 404、それ以外は 500 と切り分け。既存の空ボディ 500 を必ず JSON エラーにする。

### A-3. 設定トップの 3 カードが「利用可能」表示なのに `alert()` で終わる

[app/(admin)/admin/settings/page.tsx](<app/(admin)/admin/settings/page.tsx>) の `settingsItems` に定義されているが `switch` に `case` がない ID:

| ID           | タイトル     | 表示ステータス | 実際の挙動                                      |
| ------------ | ------------ | -------------- | ----------------------------------------------- |
| `faq`        | よくある質問 | `available`    | `alert('よくある質問の設定ページは準備中です')` |
| `media-info` | 媒体情報     | `available`    | 同上                                            |
| `newsletter` | メルマガ送信 | `available`    | 同上                                            |

- [app/(admin)/admin/settings/page.tsx:283-284](<app/(admin)/admin/settings/page.tsx:283>) — `console.log` + ブラウザ標準 `alert()`
- 結果、下部の統計カード「利用可能 17 / 準備中 1」も**実態と食い違う**（実際は準備中 4 相当）

**依頼内容**: 3 つを `coming-soon` に修正するか、ページを実装。`alert()` は `toast()` に置換。統計はステータスから算出しているので自動で直る。

### A-4. CTI（着信ポップアップ）が完全にダミー

[hooks/use-cti.ts](hooks/use-cti.ts)

- 顧客検索が `import { customers } from '@/lib/customer/data'` の**静的モック配列**を参照 → 実 DB の顧客は絶対にヒットしない
- 着信トリガーは URL クエリ `?tel=` のみ（[components/cti/cti-provider.tsx:20](components/cti/cti-provider.tsx:20)）。電話機・PBX 連携なし
- `answerCall` / `rejectCall` は `console.log` するだけ

**依頼内容**: 実装方針の決定（PBX webhook 受け口を作るのか、機能ごと落とすのか）。少なくとも顧客検索は `/api/customer/by-phone/[phone]` に差し替え。

### A-5. 集計「エクスポート」ボタンが無反応

[app/(admin)/admin/analytics/daily-sales/page.tsx:160-162](<app/(admin)/admin/analytics/daily-sales/page.tsx:160>)

```ts
const handleExport = () => {
  // エクスポート機能の実装
  console.log('Exporting data...')
}
```

ボタンは押せるが何も起きない。**システム全体で CSV / Excel エクスポートが 1 箇所も実装されていない**（`印刷する` のみ 10 画面に存在）。売上管理システムとしては致命的な欠落。

**依頼内容**: 集計 14 画面共通の CSV エクスポート（UTF-8 BOM 付き、Excel 対応）を実装。

### A-6. チャットがリアルタイム更新されない

[components/chat/chat-window.tsx:141-149](components/chat/chat-window.tsx:141)

- メッセージ取得は `participantId` 変更時の `useEffect` のみ。**ポーリングも SSE も WebSocket もない**
- 相手からの新着メッセージは、会話を切り替えるかリロードするまで表示されない
- `isOnline` は常に `false` 固定（[app/api/chat/customers/route.ts:96, 142](app/api/chat/customers/route.ts:96) に `// TODO: Implement real-time status`）
- ヘッダー通知だけは 30 秒ポーリングしている（[contexts/notification-context.tsx:333, 368](contexts/notification-context.tsx:333)）ため、「通知は来るのに画面が更新されない」という最悪の体験になる

設計だけは [docs/REALTIME_CHAT_IMPLEMENTATION_PLAN.md](docs/REALTIME_CHAT_IMPLEMENTATION_PLAN.md) に SSE 案が存在（未着手）。

**依頼内容**: 最低限チャットウィンドウにポーリング（5〜10秒）を入れる。中期的に計画書どおり SSE 化。

### A-7. 出勤スケジュール更新が保存されない経路がある

[lib/cast-schedule/usecases.ts:112-120](lib/cast-schedule/usecases.ts:112)

```ts
async updateSchedule(castId, date, status, time?) {
  // In a real application, this would update via an API
  console.log('Updating schedule:', { castId, date, status, time })
}
```

旧 API 互換メソッドが no-op。呼び出し元があれば**サイレントにデータが消える**。

**依頼内容**: 呼び出し元を調査。使われていなければ削除、使われていれば `/api/cast-schedule` に接続。

### A-8. 日次売上の手動更新が no-op

[lib/daily-sales/repository-impl.ts:32](lib/daily-sales/repository-impl.ts:32) — `console.info('Daily sales manual update is not implemented yet.')`

---

## B. 🟠 モック止まり / 未実装

### B-1. 決済状況ページが丸ごとハードコードのダミーデータ

[app/(admin)/admin/analytics/payment-status/page.tsx:36-106](<app/(admin)/admin/analytics/payment-status/page.tsx:36>)

```ts
// Mock data for demonstration - in real implementation, this would fetch from API
const mockPayments: PaymentTransaction[] = [ ... ]
```

DB には `PaymentIntent` / `PaymentTransaction` モデルが存在するのに接続されていない。**画面に嘘の金額が出る**ので、実データ接続かページ非公開かの判断が必要。

### B-2. オンライン決済プロバイダが `manual` のみ

[lib/payment/providers/registry.ts](lib/payment/providers/registry.ts) に登録されているのは `ManualPaymentProvider` だけ。Stripe 等の実装なし。`app/api/payments/route.ts` の JSDoc も「provider reconciliation 承認まで無効」と明記。→ 意図的なら OK、ロードマップに残す。

### B-3. プッシュ通知がモック

[lib/push/client.ts](lib/push/client.ts) — `@known_issues Mock implementation - replace with actual push service (FCM, APNs, etc.)`。`setTimeout(100)` して成功を返すだけ。**呼び出し側は成功したと誤認する。**

### B-4. 分析リポジトリの一部がランダム生成値

[lib/analytics/repository-impl.ts](lib/analytics/repository-impl.ts)（`generateMonthlyData` 等）はモック実装。UI は API 版 [lib/analytics/repository.ts](lib/analytics/repository.ts) を使っているが、`getOptionCombinationData()` は無条件で `[]` を返す（オプション組み合わせ分析が常に空）。

### B-5. 中身が空の設定ページ

| ページ                                                                                                 | 状態                                         |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| [app/(admin)/admin/settings/templates/page.tsx](<app/(admin)/admin/settings/templates/page.tsx>)       | 「定型文コレクション（準備中）」+ 無効ボタン |
| [app/(admin)/admin/settings/mutual-links/page.tsx](<app/(admin)/admin/settings/mutual-links/page.tsx>) | 「リンク一覧（準備中）」+ 無効ボタン         |
| [app/(admin)/admin/settings/hp-pricing/page.tsx](<app/(admin)/admin/settings/hp-pricing/page.tsx>)     | 「料金テーブル（準備中）」                   |

いずれも設定トップでは「利用可能」表示 → 遷移して初めて空とわかる。

### B-6. 指名料の全店舗同期が未実装

[app/(admin)/admin/settings/designation-fees/page.tsx:225-229](<app/(admin)/admin/settings/designation-fees/page.tsx:225>) — ボタンは `toast('同期機能は準備中です')` を出すだけ。

### B-7. 写メ日記が外部サイトへのリダイレクトのみ

[app/cast/(portal)/diary/page.tsx](<app/cast/(portal)/diary/page.tsx>) — `HEAVEN_MY_PAGE_URL` へ `redirect()`。未設定なら「リンクが未設定です」カード。システム内に日記機能はない。

### B-8. 変更履歴アラートが未実装

[lib/modification-history/data.ts](lib/modification-history/data.ts) — `@known_issues Modification alerts are not implemented`、常に空配列。

---

## C. 🎨 UI / UX

### C-1. 管理画面ヘッダーの固定高さがハードコード（レイアウト崩れ）

- [components/header.tsx:138](components/header.tsx:138) — `fixed left-0 right-0 top-0 z-50 flex items-center gap-4 ... p-4`
- [app/(admin)/admin-layout-client.tsx:16](<app/(admin)/admin-layout-client.tsx:16>) — `<div className="min-h-screen w-full pt-[83px]">`

ヘッダーには店舗セレクタ・検索・通知・ログアウト等が横並びで入るため、**タブレット〜中間幅で折り返して 83px を超えるとコンテンツがヘッダーの下に潜り込む**。マジックナンバー依存をやめ、`sticky` + 通常フローか、ResizeObserver / CSS 変数で高さを渡す方式に。

### C-2. モバイル / タブレットで主要操作に到達できない

`components/header.tsx` の「予約作成」「顧客検索」は `hidden ... xl:flex`（1280px 未満で非表示）。一方モバイル用の Sheet メニュー（[components/header.tsx:141-171](components/header.tsx:141)）にはナビリンクと集計しか入っていない。

**店頭のタブレットからヘッダー経由で予約を作れない。** Sheet に「予約作成」「顧客検索」を追加すべき。

### C-3. アナリティクス系コンポーネントにレスポンシブ指定が皆無

`components/analytics/` 配下の 30 ファイル以上に `sm:` / `md:` / `lg:` が 1 つもない。加えて 3 つは shadcn の `Table`（`overflow-auto` ラッパー付き）を使わず生の `<table>`:

- `components/analytics/cast-performance-table.tsx`
- `components/analytics/daily-report-table.tsx`
- `components/analytics/staff-attendance-table.tsx`
- （同様に `components/store-schedule-content.tsx` も生 `<table>`）

→ 狭い画面で横スクロールできず、ページ全体が横に破綻する。

### C-4. ローディング表現がバラバラ

同一プロダクト内に 4 系統が混在:

| 表現                                  | 例                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 生の `<div>Loading...</div>`          | [app/(admin)/admin-layout-client.tsx:28](<app/(admin)/admin-layout-client.tsx:28>)（日本語UIに英語）                                         |
| `<p>Loading...</p>`                   | [app/(admin)/admin/analytics/daily-report/daily-report-client.tsx:64](<app/(admin)/admin/analytics/daily-report/daily-report-client.tsx:64>) |
| 「データを読み込み中です...」テキスト | 集計 8 画面                                                                                                                                  |
| `Loader2` スピナー                    | cast-portal のみ                                                                                                                             |
| Skeleton                              | わずか 6 ファイル                                                                                                                            |

さらに未認証時のトップは**スタイルなしの素の黒文字**「店舗情報を読み込み中...」が左上に出るだけ（スクリーンショット確認済み）。ブランドサイトの第一印象として弱い。

**依頼内容**: `<PageLoading />` / `<TableSkeleton />` を共通化して全面置換。英語の "Loading..." を排除。

### C-5. `alert()` / `confirm()` が残っている

トースト基盤（`hooks/use-toast`, 38 箇所で使用）があるのに、ブラウザ標準ダイアログが残存:

- [app/(admin)/admin/settings/page.tsx:284](<app/(admin)/admin/settings/page.tsx:284>) — `alert()`
- [components/cast-schedule/schedule-edit-dialog.tsx:162, 170](components/cast-schedule/schedule-edit-dialog.tsx:162) — `alert()`
- [components/cast/schedule-edit-dialog.tsx:165, 172](components/cast/schedule-edit-dialog.tsx:165) — `alert()`
- [components/cast/cast-line-registration-panel.tsx:84](components/cast/cast-line-registration-panel.tsx:84) — `window.confirm()`（`AlertDialog` に置換すべき）

※ `components/cast-schedule/schedule-edit-dialog.tsx` と `components/cast/schedule-edit-dialog.tsx` は**ほぼ重複したコンポーネント**。統合対象。

### C-6. 設定トップの遷移が `window.location.href`（フルリロード）

[app/(admin)/admin/settings/page.tsx:241-281](<app/(admin)/admin/settings/page.tsx:241>) — 14 箇所すべて `window.location.href`。SPA 遷移が壊れ、毎回白画面 + セッション再取得が走る。巨大な `switch` 自体も不要で、`settingsItems` に `href` を持たせて `<Link>` にすれば 40 行以上削減できる。

### C-7. 管理画面にデザイントークンが浸透していない

- 管理画面系（`app/(admin)`, `components/admin|reservation|analytics`）でのパレット直書き `bg-gray-*` / `text-emerald-*` 等が **873 箇所**、トークン利用（`bg-background`, `text-muted-foreground` 等）が **566 箇所**
- 「印刷する」ボタンは 10 画面で `bg-emerald-600 text-white hover:bg-emerald-700` を毎回コピペ
- Recharts の色も `#10b981` / `#6b7280` などハードコード（`--chart-1`〜`--chart-5` トークンが定義済みなのに未使用）

一方で顧客向けサイトは `luxury-*` トークン体系（黒×金）で作られており、**管理画面（shadcn デフォルト白 + emerald）と完全に別デザイン**。統一方針の決定が必要。

### C-8. ダークモードが「入っているのに動かない」

- `next-themes` が dependencies にあり、`tailwind.config.ts` に `darkMode: ['class']`、`styles/globals.css` に `.dark` トークン一式が定義済み
- しかし [components/theme-provider.tsx](components/theme-provider.tsx) は**どこからも import されていない**（`app/layout.tsx` は `AuthProvider` / `StoreProvider` / `Toaster` のみ）
- アプリ全体で `dark:` クラスの使用は 2 ファイルのみ、テーマ切替 UI も存在しない

**依頼内容**: 実装する（Provider を差して切替 UI 追加）か、`next-themes` + `theme-provider.tsx` + `.dark` トークンを削除するか決定。

### C-9. 管理者ログイン画面が素っ気ない

[app/admin/login/page.tsx](app/admin/login/page.tsx)（実機確認済み）

- ロゴ・ブランド要素が一切ない白背景カード
- メールには placeholder があるがパスワードにはない（不統一）
- パスワード表示切替なし、`autoFocus` なし
- 「パスワードをお忘れの方」導線なし（`/api/auth/forgot-password` は実装済みなのに管理者は使えない）
- ブラウザタブのタイトルが「金の玉クラブ | GOLD ESTHE GROUP」（C-10 参照）

### C-10. ルート metadata に単一店舗のブランドがハードコード

[app/layout.tsx:41-43](app/layout.tsx:41)

```ts
title: '金の玉クラブ | GOLD ESTHE GROUP',
description: '密着度の高い性感睾丸マッサージ専門店「金の玉クラブ」公式サイト',
```

マルチストア構成なのに全ルート共通。**管理画面・キャストポータルのタブにも店舗名と性的な説明文が出る**（店頭 PC でタブを開いた際のリスク）。`app/(admin)/layout.tsx` にはちゃんと `title: '管理画面'` があるが、`/admin/login` はルートグループ外なので効かない。

### C-11. `robots: { index: false }` が全ルートに固定

[app/layout.tsx:44-51](app/layout.tsx:44) — プレビュー運用中は妥当だが、**本番公開時に必ず外す必要がある**。顧客向けサイトが検索に出ない。リリースチェックリスト項目として明示を。

### C-12. フォーム実装が二重基準

`react-hook-form` + `zod` を「Key Technologies」に掲げているが、実際に `useForm` を使っているのは 8 ファイルのみ。他の入力画面（設定各種、予約ダイアログ等）は素の `useState` で、バリデーション表示・エラーフォーカス・未保存警告の挙動が画面ごとに違う。

### C-13. 未成年判定で外部サイトへ強制遷移

[app/page.tsx:35](app/page.tsx:35) / [components/store-home-client.tsx:31](components/store-home-client.tsx:31) — `window.location.href = 'https://www.google.com'`。挙動としては一般的だが、遷移先が外部固定なのは要確認（自社の説明ページに変えるか、設定可能にするか）。

### C-14. 印刷レイアウトが未整備

「印刷する」ボタンが 10 画面にあるが、`styles/globals.css` に `@media print` が 1 行もない。個別の `print:hidden` / `print:border-none` が散在するのみ。**`position: fixed` のヘッダーが全ページに印字される**可能性が高い。

---

## D. 🏗️ アーキテクチャ / コード品質

### D-1. 巨大ファイル

| ファイル                                                                                                 | 行数      |
| -------------------------------------------------------------------------------------------------------- | --------- |
| [components/reservation/reservation-dialog.tsx](components/reservation/reservation-dialog.tsx)           | **3,127** |
| [app/api/reservation/route.ts](app/api/reservation/route.ts)                                             | 1,983     |
| [components/reservation/quick-booking-dialog.tsx](components/reservation/quick-booking-dialog.tsx)       | 1,813     |
| [app/(admin)/admin/customers/[id]/page.tsx](<app/(admin)/admin/customers/[id]/page.tsx>)                 | 1,435     |
| [components/store-booking/store-booking-content.tsx](components/store-booking/store-booking-content.tsx) | 1,219     |
| [components/cast/cast-form.tsx](components/cast/cast-form.tsx)                                           | 1,024     |

`reservation-dialog.tsx` と `quick-booking-dialog.tsx` は責務が重なっており、共通ロジックの抽出余地が大きい。

### D-2. 未使用エクスポートが 324 件

`pnpm prune`（ts-prune）で 324 件。バレルファイル（`lib/customer/index.ts`, `lib/course-option/index.ts`, `lib/pricing/index.ts` 等）が使われないまま再エクスポートしているケースが目立つ。`lib/cast-schedule/old-data.ts` のような明示的な旧ファイルも残存。

### D-3. モックフォールバックの方針が不統一

`shouldUseMockFallbacks()` を見る API（settings 系）、`env.featureFlags.useMockFallbacks` を見る API（cast / course / option / customer / designation-fee）、フォールバックが無い API が混在。さらに A-2 のせいで**フォールバックが書いてあるのに到達しない**ルートがある。「開発時にどこまでモックで動くべきか」の一貫した定義が必要。

### D-4. 例外の握り潰し

`catch (error) { console.error(...) }` だけで終わるパターンが tsx 内に 67 箇所。ユーザーには何も表示されず、失敗が静かに無視される（例: [components/header.tsx:92](components/header.tsx:92) のキャスト一覧取得失敗）。

### D-5. 本番コードに残る `console.log`

- [app/(admin)/admin/analytics/daily-sales/page.tsx:162](<app/(admin)/admin/analytics/daily-sales/page.tsx:162>)
- [app/(admin)/admin/settings/page.tsx:283](<app/(admin)/admin/settings/page.tsx:283>)
- [lib/cast-schedule/usecases.ts:120](lib/cast-schedule/usecases.ts:120)

`pino` ロガー（`lib/logger`）があるので統一を。

---

## E. 🔒 セキュリティ

### E-1. セキュリティヘッダーがアプリ側に無い（本番はエッジで付与済み）

> **2026-07-27 訂正**: 本番 `https://salon.c-platinum.com` の実レスポンスを確認したところ、**セキュリティヘッダーは付与されている**。当初「未設定」と記載したが、正しくは「このリポジトリでは未設定で、リバースプロキシ側（`platinum-management` の Nginx 想定）で付与されている」。

本番で実際に返っているヘッダー:

```
content-security-policy: base-uri 'self'; frame-ancestors 'none'; object-src 'none'
strict-transport-security: max-age=31536000; includeSubDomains
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(self), geolocation=(), microphone=()
x-robots-tag: noindex, nofollow, noarchive
```

残る課題は 2 点:

1. **CSP が実質 XSS を防いでいない** — `default-src` / `script-src` / `style-src` が無く、`base-uri` `frame-ancestors` `object-src` のみ。スクリプト実行の制限がかかっていない
2. **多層防御になっていない** — `next.config.mjs` の `headers()` が空のため、このプロキシを経由しない経路（コンテナ直叩き、将来の別ホスティング）ではヘッダーが一切付かない

**依頼内容**: `next.config.mjs` に `headers()` を追加してアプリ自体でも同等のヘッダーを返す（プロキシ側と二重でも害はない）。併せて `script-src` を含む CSP への強化を検討。

なお `x-robots-tag: noindex, nofollow, noarchive` もエッジで付与されているため、**C-11 の本番公開時対応はアプリ側 `app/layout.tsx` とプロキシ設定の両方を外す必要がある**。

### E-2. middleware に `matcher` がない

[middleware.ts](middleware.ts) に `export const config = { matcher: [...] }` が存在しない。結果、**`/_next/static/*` を含む全リクエストで `getToken()`（JWT 復号）が走る**。`publicRoutes` に `/_next` はあるが、その判定より前に `getToken()` を呼んでいるため無意味。

### E-3. `publicRoutes` に `'/'` があり `startsWith` 判定

[middleware.ts:13](middleware.ts:13) — `publicRoutes = ['/', '/_next', '/favicon.ico']` を `pathname.startsWith(route)` で評価 → **`'/'` は全パスにマッチ**し、`isPublicRoute` が常に true。`/admin` `/cast` `/mypage` は手前で個別処理されているので現状は穴になっていないが、極めて壊れやすい。同 106 行の正規表現 `/^\/((?!admin|mypage|cast).)*$/` も文字単位の否定先読みで、**店舗 slug に "cast" 等が含まれると誤判定**する。

### E-4. 認証情報が git 管理下のファイルに実値で入っている

`.env` は `.gitignore` 済みで**コミットはされていない**が、ワークツリーに Supabase の anon key / DB 接続文字列が平文で存在。今回のように参照が漏れやすい。ローテーションと、開発者向けの `.env.local` 運用への統一を推奨。

---

## F. ⚡ パフォーマンス

### F-1. 画像最適化が全面的に無効

- [next.config.mjs](next.config.mjs) — `images: { unoptimized: true }`
- `next/image` を使っているのは 2 ファイルのみ（`reservation-table.tsx`, `cast-detail-content.tsx`）
- 顧客向けサイトのヒーロー画像・キャスト写真は生 `<img>`（[components/store-home-content.tsx:123, 365, 393, 419](components/store-home-content.tsx:123)）

キャスト写真が主コンテンツのサイトで、リサイズ・WebP 変換・遅延読み込みが一切ない。**LCP に直結する最大の改善ポイント。**

### F-2. 通知ポーリングが 2 系統 × 30 秒

[contexts/notification-context.tsx:333, 368](contexts/notification-context.tsx:333) — 予約通知とチャット通知が別々に 30 秒間隔でフル取得。管理画面を開きっぱなしにする運用（店舗業務）では常時負荷。SSE 化（A-6 と同時に）を推奨。

---

## G. 🧪 テスト / CI

### G-1. カバレッジ閾値が実測より大幅に低い

実測 58.16% に対し `vitest.config.ts` の閾値は 30%。**28 ポイントの余裕があり、退行を検知できない。** 現状値に合わせて 55% 程度へ引き上げるべき。

### G-2. E2E テストがない

`CLAUDE.md` にも「Playwright is not currently configured」と明記。予約フロー（5 ステップ）・ログイン・決済のような複合フローが自動検証されていない。A-2 のような「型は通るが実行時に 500」は現行 CI では検出できなかった。

### G-3. 未カバーの主要スクリプト

`prisma/seed.ts`（616 行）、`prisma/seed-full.ts`（422 行）、`scripts/setup-admin.ts`、`scripts/init-database.js` などがカバレッジ 0%。

---

## H. 📦 リポジトリ運用

| 課題                         | 詳細                                                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ロックファイル二重管理       | `package-lock.json`（494KB）と `pnpm-lock.yaml`（345KB）が**両方コミット済み**。CI は `pnpm install --frozen-lockfile`。`package-lock.json` を削除すべき        |
| env サンプル二重管理         | `.env.example` と `env.example`（ドット無し）が両方トラックされている                                                                                           |
| 未追跡ファイル               | `docs/IKEBUKURO_FIELD_UAT_MANUAL.md`（コミット漏れ）、`output/`（`.gitignore` 未登録の生成物）                                                                  |
| ルート直下のドキュメント散乱 | `refactor-instructions.md`（36KB）、`ui-improvement-instructions.md`（29KB）、`refactor-baseline.md` が完了済みタスクのまま放置。`docs/` へ移動またはアーカイブ |
| `next lint` 非推奨           | Next.js 16 で削除予定。`npx @next/codemod@canary next-lint-to-eslint-cli .` で移行が必要                                                                        |
| ESLint 設定が最小            | `.eslintrc.json` は `next/core-web-vitals` のみ。`@typescript-eslint` ルールや `no-console` などのルールがなく、D-4 / D-5 を検出できない                        |
| プロジェクト名が初期値       | `package.json` の `"name": "my-v0-project"`                                                                                                                     |

---

## I. 推奨実行順（Codex 向け）

### フェーズ 0 — 公開前に必ず塞ぐ

0a. **J-1** 年齢確認を店舗配下の全ルートに適用（コンプライアンス）
0b. **J-4** ヒーロー画像 404 と `onError` フォールバック（顧客の第一印象）
0c. **J-8** ログイン / 会員登録フォームの `autocomplete` `inputmode` `required`

### フェーズ 1 — まず動くようにする

1. **A-1** ローカル DB 環境（docker-compose + README + `.env.example` 整合）
2. **A-2** `ensureStoreId` の try 内移動 × 5 箇所 + `Unknown store` → 404
3. **J-2 / D-3** 顧客向け 7 ページのフォールバック整備（特に `public-casts.ts`）
4. **J-3** エラーバウンダリ / not-found の導線修正
5. **A-3** 設定トップの死んだカード 3 件 + `alert()` 撤去
6. **H** ロックファイル / env サンプル / 未追跡ファイルの整理

### フェーズ 2 — 嘘の表示をなくす

4b. **K-1** 顧客一覧の会員種別（`select` に `memberType` 追加）
4c. **K-2 / K-3** 一覧のページネーションとキャスト API の過剰フェッチ（実データ投入前に必須）5. **B-1** 決済状況ページ（実データ接続 or 非公開）6. **A-5** CSV エクスポート共通実装 7. **B-3 / A-4 / A-7 / A-8** モック実装の棚卸し（実装・削除・明示のいずれかに確定）8. **C-10 / C-11** metadata の店舗別化と `robots` のリリース手順化

### フェーズ 3 — UI/UX 基盤

9. **J-5 / J-6 / J-7 / J-11 / J-12** 顧客向けサイトの表示不具合（ナビ折り返し・タップ領域・見出し重複・モバイル CTA・title 統一）
10. **C-1 / C-2 / C-3** レイアウト崩れとモバイル到達性
11. **C-4 / C-5** ローディング・ダイアログの共通化
12. **C-6 / C-7 / C-8 / J-13** ナビゲーション方式とテーマ機構の一本化、ダークモードの可否決定
13. **C-14** 印刷 CSS
14. **J-10** シードデータの整合性

### フェーズ 4 — 品質・非機能

15. **E-1 / E-2 / E-3** セキュリティヘッダーと middleware 整理
16. **F-1** 画像最適化
17. **A-6 / F-2 / J-9** チャット SSE 化とポーリング・セッション取得の統合
18. **G-1 / G-2** カバレッジ閾値引き上げ + Playwright 導入
19. **D-1 / D-2** 巨大ファイル分割と未使用コード削除

---

## J. ライブレビュー結果（顧客向けサイト実機確認）

年齢確認ゲートを通過し、`/ikebukuro` 配下をブラウザ実機（デスクトップ 1280×720 / モバイル 375×812）で確認した結果。**A〜I とは独立した追加の発見。**

### J-1. 🔴 年齢確認ゲートがトップページにしか無い（コンプライアンス）

**最重要。** 年齢確認は `components/store-home-client.tsx` と `app/page.tsx` の**店舗トップと全体トップにしか実装されていない**。`app/[store]/layout.tsx` には無い。

`localStorage.ageVerified` を削除した状態で `/ikebukuro/services` に直接アクセスすると、**年齢確認を一切挟まずに成人向けコンテンツが表示される**（実機確認済み）。同様に `/cast` `/pricing` `/reviews` `/ranking` すべて素通り。

検索・SNS からのディープリンクが主要流入経路である以上、実質的にゲートが機能していない。加えて `localStorage` 判定のみなのでサーバー側の担保もない。

**依頼内容**: 年齢確認を `app/[store]/layout.tsx`（またはミドルウェア + Cookie）に移し、店舗配下の全ルートを対象にする。

### J-2. 🔴 顧客向けページ 9 本中 7 本が DB 障害時にエラー画面へ落ちる

A-1 の DB 停止状態で各ページの RSC レンダリング結果を確認:

| ページ                            | 結果                          |
| --------------------------------- | ----------------------------- |
| `/ikebukuro`                      | ✅ モックフォールバックで表示 |
| `/ikebukuro/services`             | ✅ 表示                       |
| `/ikebukuro/cast`（在籍一覧）     | 💥 エラーバウンダリ           |
| `/ikebukuro/schedule`（出勤一覧） | 💥 エラーバウンダリ           |
| `/ikebukuro/pricing`（料金）      | 💥 エラーバウンダリ           |
| `/ikebukuro/ranking`              | 💥 エラーバウンダリ           |
| `/ikebukuro/reviews`              | 💥 エラーバウンダリ           |
| `/ikebukuro/recruitment`          | 💥 エラーバウンダリ           |
| `/ikebukuro/booking`（予約）      | 💥 エラーバウンダリ           |

原因は D-3 のフォールバック方針の不統一。`lib/store/` 配下でモックフォールバックを持つのは `public-home-server.ts` と `public-pricing.ts` のみで、**在籍一覧の `public-casts.ts` `getPublicCastProfiles()` には無い**（実際のスタックトレースで確認）。

DB が健全なら動作するが、**一時的な DB 断でサイトの主要 7 ページが同時に落ちる**設計であることに変わりはない。

### J-3. エラーバウンダリからサイトに戻れない

[app/[store]/error.tsx](app/[store]/error.tsx) は `再試行` ボタンのみ。ヘッダー・フッター・店舗トップへのリンクが無く、**ユーザーが行き止まりになる**（JSDoc の `@known_issues` でも自認済み）。

- 併せて [app/[store]/not-found.tsx](app/[store]/not-found.tsx) の「トップへ戻る」は `/`（全体トップ）を指しており、**店舗トップ `/${store}` ではない**
- 両ファイルとも色が `#0b0b0b` `#f5e6c4` `#3b2e1f` `#121212` のハードコード（`luxury-*` トークンが定義済みなのに未使用）

### J-4. ヒーロー画像が 404 で「画像壊れアイコン + alt テキスト」が露出

[components/store-home-content.tsx:98-99](components/store-home-content.tsx:98)

```ts
const heroImage =
  store.images?.main || store.images?.gallery?.[0] || '/images/banners/campaign-1.jpg'
```

`store.images.main` に `/images/stores/ikebukuro/main.jpg` が入るが、**`public/images/stores/` ディレクトリ自体が存在しない**（`public/images/` には `banners/` と `non-photo.svg` のみ）。文字列は truthy なのでフォールバックが働かず、モバイルでは **375×994px 全面が壊れ画像**になる（実機確認済み）。

さらに **コードベース全体で `<img>` に `onError` ハンドラが 1 つも無い**。`public/images/non-photo.svg` というプレースホルダは用意されているのに未使用。

**依頼内容**: `onError` で `non-photo.svg` にフォールバックする共通 `<SafeImage>` を作る（F-1 の `next/image` 移行と同時が効率的）。

### J-5. デスクトップのグローバルナビが全項目 2 行折り返し

1280px（標準的なノート PC 幅）で計測した結果、**ヘッダーナビ 7 項目すべてが 2 行に折り返している**:

| 項目         | 幅   | 行数 |
| ------------ | ---- | ---- |
| 料金システム | 79px | 2    |
| プレイ内容   | 66px | 2    |
| 在籍一覧     | 53px | 2    |
| 出勤一覧     | 54px | 2    |
| 入店情報     | 53px | 2    |
| ランキング   | 67px | 2    |
| クチコミ     | 53px | 2    |

原因は [components/store-navigation.tsx](components/store-navigation.tsx) のリンククラス `text-xs font-semibold tracking-[0.2em]`（letter-spacing 2.4px）で文字幅が膨らむ一方、`whitespace-nowrap` が無いこと。右側の縦型フローティングバー（セラピスト／スケジュール／ネット予約）も同様に「セラピス/ト」「ネット予/約」と途中で折れている。

**依頼内容**: `whitespace-nowrap` 付与 + `lg:` ブレークポイントの見直し（実質 1440px 以上でないと収まらない）。

### J-6. タップターゲットが推奨サイズ（44×44px）未満

モバイル 375px で計測:

| 要素                                    | サイズ      |
| --------------------------------------- | ----------- |
| バナーのページネーションドット          | **12×12px** |
| バナー前へ／次へ                        | 38×38px     |
| ハンバーガーメニュー                    | 40×40px     |
| フッター SNS アイコン（Twitter / LINE） | 32×32px     |
| フッター電話番号リンク                  | 高さ 32px   |

特にバナードットの 12px は実用上ほぼ押せない。

### J-7. ログイン画面で見出しが重複表示

`/ikebukuro/login` で「ログイン」「会員の方はこちらからログインしてください」が**上下に 2 回**表示される（実機確認済み）。

- [app/[store]/login/page.tsx:33-34](app/[store]/login/page.tsx:33) — ページヒーロー側
- [components/auth/login-form.tsx:93-95](components/auth/login-form.tsx:93) — カード側

同じ文言が二重定義されている。どちらかを削除すべき。

### J-8. フォームに `autocomplete` がほぼ付いていない

入力欄を持つ 44 ファイル中、`autoComplete` を指定しているのは **3 ファイルのみ**（`cast-portal/login-form.tsx`, `auth/verify-phone-form.tsx`, `cast/cast-form.tsx`）。

**最も重要な顧客ログイン・会員登録フォームには 1 つも付いていない**（DOM で実測）:

| フォーム | 項目                                                  | autocomplete | inputmode            | required |
| -------- | ----------------------------------------------------- | ------------ | -------------------- | -------- |
| ログイン | email / password                                      | ❌           | ❌                   | ❌       |
| 会員登録 | nickname / email / phone / password / confirmPassword | ❌           | ❌（tel でも未指定） | ❌       |

パスワードマネージャーとブラウザ自動入力が機能せず、モバイルで電話番号欄に数字キーパッドも出ない。会員登録の離脱率に直結する。加えて会員登録のチェックボックス 2 つは `name` 属性も未設定。

**依頼内容**: `autocomplete="email" / "current-password" / "new-password" / "tel" / "nickname"`、`inputMode="tel"`、`required` の一括付与。

### J-9. `/api/auth/session` が 1 ページロードで 3 回叩かれる

ネットワークログで確認。`useSession()` の呼び出し箇所ごとにリクエストが発生している疑い。`SessionProvider` の `refetchOnWindowFocus` / `refetchInterval` 設定と併せて見直しを（F-2 と同種の無駄）。

### J-10. モックデータの内容が矛盾していて画面に出る

店舗トップの実表示:

- **「ことね」がランキング 1 位でありながら NEW FACE（新人紹介）にも掲載**
- 「すずか」がランキング 4 位・本日の出勤・お客様の声 2 件すべてに登場
- 平均評価が **5.0**（口コミ全件が満点）
- キャスト画像が全カード「NO IMAGE」

UAT やデモで顧客に見せる際、そのまま不自然に映る。シードデータの見直しが必要。

### J-11. モバイルヘッダーに電話 CTA が無い

デスクトップヘッダーには電話番号 `03-1234-5678` と営業時間が常時表示されるが、**モバイルではハンバーガーの中に隠れる**。この業種では「モバイルの追従電話／予約ボタン」が定番であり、トップページの縦幅もモバイルで 7,456px あるため、スクロール途中からの導線が無いのは機会損失。

### J-12. ページタイトルのテンプレートが不統一

- `/ikebukuro` → `店舗トップ`（店舗名なし）
- `/ikebukuro/cast` → `在籍一覧 | サロン池袋店`
- `/ikebukuro/services` → `サロン池袋店 | GOLD ESTHE GROUP`

[app/[store]/layout.tsx](app/[store]/layout.tsx) の `template` は `%s | ${store.displayName}` だが、各ページの `title` 指定がまちまちで 3 パターンに割れている。

### J-14. 本番の店舗トップが「中身の無い HTML」を返している

`https://salon.c-platinum.com/ikebukuro` を認証なしで取得した結果（2026-07-27 確認）:

- HTTP 200 / 30,804 bytes / `<title>店舗トップ</title>`
- しかし **HTML 本文に「サロン池袋店」「年齢確認」等の文字列が 1 つも含まれない**（Prisma エラーも無いので DB は正常）

原因は [components/store-home-client.tsx:35-37](components/store-home-client.tsx:35):

```ts
if (isLoading) {
  return null
}
```

`isLoading` の解除は `useEffect` で `localStorage` を読んだ後なので、**サーバーレンダリング時は常に `null`**。結果、店舗トップは JS 実行前は完全な空ページになる。

- 現状は `x-robots-tag: noindex` なので SEO 影響は顕在化していないが、**C-11 で公開に切り替えた瞬間にクローラーには空ページとして扱われる**
- JS 無効環境・低速回線での初期表示が空白（LCP が完全に JS 依存）
- J-1 の年齢確認をサーバー側（Cookie + middleware）に移せば、この問題も同時に解消する

### J-13. 参考: テーマ機構が 3 系統に分裂している

[app/[store]/layout.tsx:56-79](app/[store]/layout.tsx:56) は shadcn トークン（`--background` `--card` 等）を**インライン `style` で丸ごと上書き**して黒金テーマを実現している。つまり:

1. `styles/globals.css` の `:root`（管理画面が使用）
2. `app/[store]/layout.tsx` のインライン上書き（顧客向けが使用）
3. `next-themes` + `.dark`（**誰も使っていない**、C-8）

C-7 / C-8 と併せて、テーマ戦略の一本化を検討すべき。副作用として、同一コンポーネント `AgeVerification` が `/` ではライトグレー、`/ikebukuro` では黒金と**まったく別の見た目でレンダリングされる**（実機確認済み）。`components/age-verification.tsx` 自体は `bg-gray-100` をハードコードしているため、ライト版が意図せず残っている。

---

## K. 管理画面のコードレビュー結果（ログイン不要で判明した分）

ログインせずコードから確認した管理画面の問題。**ログイン後の実機確認を待つ必要はない項目。**

### K-1. 🔴 顧客一覧の「会員種別」が常に「通常」と表示される

[app/api/customer/route.ts:226-239](app/api/customer/route.ts:226) の一覧取得分岐の `select`:

```ts
select: {
  ;(id, nameKana, name, phone, email, createdAt, updatedAt)
} // ← memberType が無い
```

一方 [app/(admin)/admin/customers/page.tsx:96-99](<app/(admin)/admin/customers/page.tsx:96>) は:

```tsx
<Badge variant={customer.memberType === 'vip' ? 'default' : 'secondary'}>
  {customer.memberType === 'vip' ? 'VIP' : '通常'}
</Badge>
```

`memberType` が常に `undefined` なので、**VIP 顧客も含めて全員が「通常」と表示される**。しかもこの分岐だけ `sanitizeCustomer()` を通さず生の行を返しているため、モックフォールバック時（`memberType` を含む）とは挙動が食い違う。

**依頼内容**: `select` に `memberType` を追加。併せて一覧分岐も `sanitizeCustomer` を通して他分岐と揃える。

### K-2. 🔴 一覧画面にページネーションが 1 つも無い

| 画面         | ページネーション | 件数制限                                |
| ------------ | ---------------- | --------------------------------------- |
| 顧客一覧     | ❌               | ❌ API 側も `take` 無しで全件           |
| 予約一覧     | ❌               | ❌ `limit` 未指定なら `take: undefined` |
| キャスト一覧 | ❌               | ❌                                      |
| 口コミ管理   | ❌               | ❌                                      |
| 横断検索     | ❌               | —                                       |

`/api/reservation` は `limit` / `offset` / `sortBy` / `sortOrder` を**サーバー側では実装済みなのに、UI がどこからも使っていない**（[app/api/reservation/route.ts:423-431](app/api/reservation/route.ts:423)）。

顧客一覧は `customers.map()` で全行を DOM に展開し、キャスト一覧は `castList.filter()` でクライアント側絞り込みをしている。数万件規模の実データを入れた時点で実用に耐えない。加えて顧客全件の氏名・電話・メールを 1 レスポンスで返すため、PII の転送量も大きい。

### K-3. 🔴 キャスト一覧 API が全予約・全顧客を巻き込んで取得

[app/api/cast/route.ts:261-273](app/api/cast/route.ts:261)

```ts
db.cast.findMany({
  where: { storeId },
  include: {
    schedules: true,
    castOptionSettings: true,
    reservations: { include: { customer: true, course: true } }, // ← 全予約 + 全顧客
  },
})
```

`take` も日付範囲もない。**キャスト一覧を開くだけで、その店舗の全キャスト × 全予約履歴 × 各予約の顧客レコードを取得する。** 運用 1 年でレスポンスが数十 MB になり得る。ヘッダーのキャスト検索（[components/header.tsx:82](components/header.tsx:82)）も同じエンドポイントを叩くため、**全管理画面の初回表示でこれが走る。**

**依頼内容**: 一覧用の軽量 `select` を分離し、予約リレーションは詳細画面のみに。

### K-4. 未保存の変更に対する警告が存在しない

`beforeunload` / `isDirty` / 未保存確認のいずれも**コードベース全体で 0 件**。[components/cast/cast-form.tsx](components/cast/cast-form.tsx)（1,024 行）や [components/reservation/reservation-dialog.tsx](components/reservation/reservation-dialog.tsx)（3,127 行）のような大きな入力画面で、誤操作による離脱で全入力が消える。

### K-5. フォーカス管理がない

`autoFocus` の使用が**全ファイルで 0 件**。ダイアログを開いても最初の入力欄にフォーカスが当たらず、キーボード操作の起点が毎回不定。C-12（`react-hook-form` 未統一）と併せて、エラー時の該当項目へのスクロール／フォーカスも実装されていない。

### K-6. 予約 API の `sortBy` が未検証のまま Prisma に渡る

[app/api/reservation/route.ts:429-432](app/api/reservation/route.ts:429)

```ts
const sortBy = searchParams.get('sortBy') || 'startTime'
const orderBy: any = {}
orderBy[sortBy] = sortOrder
```

クエリ文字列の値がそのまま Prisma の `orderBy` キーになる。存在しないフィールドなら Prisma が例外を投げるため直接の情報漏洩には至らないが、入力検証が抜けている典型例（`sortOrder` も同様に未検証）。許可リストで縛るべき。

### K-7. 顧客一覧に検索・絞り込み・ソートが無い

[app/(admin)/admin/customers/page.tsx](<app/(admin)/admin/customers/page.tsx>) は全件テーブルを出すだけで、検索ボックスも列ソートもフィルタも無い。横断検索は別画面 `/admin/search` に分離されているが、一覧上で名前や電話番号を絞り込む導線が無いのは日常業務で負担が大きい。

### K-8. ✅ 破壊的操作の確認ダイアログは適切に実装されている（確認済み）

当初モーダル無しの `DELETE` を疑ったが、コードを追ったところ管理者無効化・エリア／駅／コース／オプション／ホテル削除・口コミ削除はすべて共通の `ConfirmDialog`（[components/shared/confirm-dialog.tsx](components/shared/confirm-dialog.tsx)）を経由していた。`components/cast/cast-dashboard.tsx:185` の `DELETE` はスケジュール保存処理の一部で、単独の削除操作ではない。**この領域は問題なし。** 唯一 C-5 に挙げた `window.confirm()` 1 箇所のみ置換対象。

---

## 付記: 未検証の領域

以下は今回の監査で**実機確認できていない**ため、別途確認が必要:

- 管理画面 / キャストポータル / マイページの**ログイン後の全画面**（パスワード入力を伴うため未ログイン）
- 実データでの予約フロー・決済フロー（A-1 の DB 障害と J-2 により `/booking` に到達できず実行不可）
- DB が健全な状態での各画面（今回の J-2 以降の描画確認はすべて DB 停止下のもの）

ログイン後の UI/UX と予約フローについては、A-1 を解消し管理者アカウントを用意したうえで、別途レビューを推奨する。

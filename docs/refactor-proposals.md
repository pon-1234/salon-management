# Refactor Proposals

作成日: 2026-07-04

この文書は `refactor-instructions.md` Phase 7 の提案のみ項目をまとめたものです。DB スキーマ変更、既存データ移行、認証仕様変更、cast-schedule 永続化の実装はここでは行いません。

## D-10: 巨大 Server ファイルの分割計画

### `lib/analytics/server/index.ts`

現状は月次、日次、スタッフ、コース、オプション、地域、時間帯、日報、勤怠の集計が 1 ファイルに同居しています。DB 取得ヘルパは `lib/analytics/server/common.ts` に既に分かれているため、次の単位で抽出すると挙動を保ったまま進められます。

- `monthly.ts`: `getMonthlyAnalytics`, `getDailyAnalytics`, 月次スタッフ/エリア summary
- `staff.ts`: `getStaffPerformanceReport`, `getStaffAttendanceReport`
- `sales.ts`: `getCourseSalesReport`, `getOptionSalesReport`, `getOptionCombinationReport`
- `area.ts`: `getAreaSalesReport`, `getDistrictSalesReport`
- `hourly.ts`: `getHourlySalesReport`
- `daily-report.ts`: `getDailyReport`

進め方は 1 関数 1 抽出を原則にし、各 API ルートの import を変えた直後に該当 route test を追加します。集計式は変更しません。

### `lib/cast-portal/server.ts`

cast portal は dashboard、profile、reservations、schedule、settlements、chat/notifications が 1 ファイルに混在しています。権限取得や cast session 解決を共通層に残し、以下の分割が妥当です。

- `cast-portal/auth.ts`: session/cast 解決、role guard
- `cast-portal/dashboard.ts`: dashboard summary
- `cast-portal/reservations.ts`: 予約一覧、予約詳細、チェックイン/アウト
- `cast-portal/schedule.ts`: 出勤予定、受付状態
- `cast-portal/settlements.ts`: 精算一覧、明細
- `cast-portal/notifications.ts`: LINE/通知関連

このファイルは typecheck 既存失敗を含むため、最初の抽出前に代表的な戻り値の characterization test を追加する必要があります。

## D-11: cast-schedule の in-memory 実装

`lib/cast-schedule/repository-impl.ts` は in-memory Map 実装で、`old-data.ts` / `old-types.ts` も現役参照されています。DB 永続化へ寄せる場合は API ルートと UI の責務を先に棚卸しし、以下の順序で進めるのが安全です。

1. 現在の `old-*` 参照箇所をすべて列挙し、画面が期待する shape をテストで固定する。
2. `repository-impl.ts` を API fetch adapter に置き換えるための interface を先に合わせる。
3. `app/api/cast-schedule` 側の権限、storeId、日付範囲の扱いを route test で固定する。
4. `old-data.ts` / `old-types.ts` は参照ゼロになった時点で削除する。

DB スキーマ変更が必要な場合はこの作業から切り離し、別途マイグレーション計画を作る必要があります。

## D-12: 型定義の配置方針

現状は `lib/<domain>/types.ts` と `lib/types/*.ts` が混在しています。挙動改善を伴わない大規模移動は避け、今後の新規・移動は次の方針に寄せます。

- ドメイン内だけで閉じる型は `lib/<domain>/types.ts`
- 複数ドメイン/API/UI にまたがる契約型は `lib/types/<domain>.ts`
- 移動時は re-export 期間を置き、import 置換と削除を別コミットに分ける

まず reservation / analytics / chat のような共有度が高い型だけ対象にし、cast/customer/pricing の既存構成は触る必要が出るまで維持します。

## D-13: Prisma Schema 改善ロードマップ

`prisma/schema.prisma` には status 文字列、Json blob、soft delete 方針のばらつき、孤立モデルなどのモデリング負債があります。保存済みデータとマイグレーションに直結するため、本リファクタでは実装しません。

候補:

- `Reservation.status`, `Message.readStatus` などの enum 化
- `Admin.permissions`, `Message.attachments` など Json blob の型付きモデル化
- `archivedAt`, `isActive` など soft delete 表現の統一
- `HotelSettings` の関連付けまたは廃止方針決定
- `Store.id` の生成方針と seed 安定 ID の整理

進める場合は、まず読み取り互換を維持した追加カラム/enum を入れ、バックフィル、アプリ切替、旧フィールド削除の段階移行にします。

## D-14: テスト体制改善

現状の `vitest.setup.ts` は DB/fetch をグローバルモックしており、空配列や成功 shape だけを確認するテストが多くなっています。すぐに全面刷新せず、以下の順で ratchet します。

- 重要計算ロジックは DB なしの純粋関数 test を増やす。
- API route test は global mock ではなく、対象 route が使う repository/server 関数を明示 mock する。
- settlement、cast-portal、designation、reservation の regression test を優先する。
- component test は skeleton/error/empty とフォーム validation を優先する。
- Playwright 導入は UI 指示書の提案と合わせ、代表フローだけから始める。

## Coverage Threshold Ratchet

現行の enforced threshold は 30% とし、今回変更しません。引き上げは次の条件を満たしてから行います。

1. `pnpm test:coverage` が CI 上で安定して完走する。
2. 2 週間以上、実測 coverage が目標値を 5pt 以上上回る。
3. 新規 test が既存 global mock の空洞を広げていないことをレビューする。

最初の候補は 35%、次に 40% です。100% は現在のテスト構成では現実的ではありません。

## Seed 既定パスワード

`scripts/create-admin.js` は削除済みですが、seed には開発用の既定パスワードが残っています。次のいずれかをプロダクト/運用で決める必要があります。

- 開発 seed のみ既定値を許可し、本番 seed 実行時は env 必須にする。
- すべての seed で初期パスワード env 必須にする。
- 初期ユーザー作成は `setup:admin` のみ許可し、seed は管理者を作らない。

推奨は「production では env 必須、development/test では固定値可」です。既存開発体験を壊さず、本番の事故だけを防げます。

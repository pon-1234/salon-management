# Refactor Instructions — salon-management

> この文書は実装担当モデルへの指示書である。ここに書かれた範囲を、ここに書かれた順序と制約で完遂すること。
> 書かれていない大規模な削除・全面書き換え・仕様変更は行ってはならない。
> 作成日: 2026-07-04。作成時点の main = `fa9e863`。

---

## 1. Objective

既存挙動を一切壊さずに、以下を達成する。

1. ドキュメントと実態の乖離を解消する(誤った記述が今後の開発判断を汚染している)
2. 検証可能なベースラインと安全網(characterization tests)を確立する
3. 証拠のある死コード・重複を小さな単位で除去する
4. ログ・エラーハンドリング・Prismaクライアント参照などの横断的な不統一を解消する
5. 巨大ファイルを、挙動を保ったまま分割しやすい構造に近づける

**目的は見た目の綺麗さではない。「変更しやすく、壊れたらすぐ分かる状態」にすることである。**

---

## 2. Project Understanding(証拠に基づく現状理解)

### 何のアプリか

エステサロン(GOLD ESTHE GROUP)の統合管理システム。Next.js 15 App Router / React 19 / TypeScript strict / Prisma (PostgreSQL) / NextAuth (JWT) / Supabase Storage / Tailwind + shadcn/ui。約10万行(app 38k、components 34k、lib 27k)。

3つのユーザー種別(NextAuth role)と対応するUIツリーがある:

| Role       | UIツリー                                  | 主な機能                                                             |
| ---------- | ----------------------------------------- | -------------------------------------------------------------------- |
| `admin`    | `app/(admin)/admin/*`(71ページ中の大半)   | 予約管理、キャスト管理、顧客管理、分析13種、設定16種、チャット、精算 |
| `cast`     | `app/cast/(portal)/*`                     | ダッシュボード、チャット、日記、予約、精算、LINE連携                 |
| `customer` | `app/[store]/*`(店舗slugでマルチテナント) | 店舗ページ、予約、マイページ、レビュー                               |

APIは `app/api/` に77ルート。認可は `middleware.ts`(一次ゲート)+ 各ルートの `requireAdmin`/`requireCast`/`requireCustomer`(`lib/auth/utils.ts`)の二段構え。ただし徹底されていないルートがある(§7 D-9)。

### データの流れ

- **永続化の実体**: Prisma(`lib/db.ts` のシングルトン `db`)。スキーマは `prisma/schema.prisma`(590行、26モデル)。マイグレーションは2026-01-21にrebaseされ2件のみ。
- **`lib/` のドメイン層**: CLAUDE.md には「repository-impl はモックデータ」とあるが、**これは古い**。cast / customer / reservation / pricing / daily-sales の repository-impl は `/api/*` を叩くHTTPクライアントになっており、Prisma処理はAPIルートと `lib/*/server.ts` にある。モックのままなのは analytics(`lib/analytics/repository-impl.ts`)と cast-schedule(in-memory Map)のみ。
- **モックフォールバック**: `lib/config/feature-flags.ts` の `shouldUseMockFallbacks()`(env `USE_MOCK_FALLBACK` / `NEXT_PUBLIC_USE_MOCK_FALLBACK`、デフォルトは非productionでtrue)。実データ取得に失敗するとモックへフォールバックする実行時フラグで、**認証にまで及ぶ**(`lib/auth/config.ts:189-198` にハードコードされたデモ顧客 `demo-tanaka` / 田中 太郎)。
- **外部連携**: LINE Messaging(webhook: `app/api/line/webhook`、通知: `lib/line/`)、Resendメール(`lib/email/client.ts`)、Vonage SMS、Supabase Storage(バケット `images`、`lib/storage/`)。決済は provider registry(`lib/payment/providers/`)でデフォルト `manual`。
- **定期ジョブ**: GitHub Actions cron のみ(`expire-points.yml` → `/api/customer/points/expire`(`CRON_SECRET` Bearer認証)、`prune-chat-attachments.yml` → `pnpm chat:prune-attachments`)。キューなし。

### 品質ゲートの実態(重要)

- `next.config.mjs:13-18` で **`eslint.ignoreDuringBuilds: true` と `typescript.ignoreBuildErrors: true`**。ビルドは型エラー・lintエラーを無視して通る。
- **push/PR時に走るCIは存在しない**。`.github/workflows/` はcronジョブ2本のみ。`scripts/ci.sh`(format:check → lint → typecheck → test → coverage → build)は手動実行のみ。
- テストは104ファイル・620件(613 pass / 7 skip)。ただし `vitest.setup.ts` が `lib/db`(Prisma)・`global.fetch`・bcrypt・logger等を**グローバルにモック**しており、実DBに触れるテストはゼロ。カバレッジ閾値は30%(`vitest.config.ts`)。
- CLAUDE.md の「カバレッジ100%必須」「ci.shがplaywrightを実行」は**どちらも事実と異なる**(playwrightは未インストール・未設定)。
- `docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md`(2026-05-29、最新かつ最も正直なドキュメント)は「Prisma実DB接続が失敗する状態」等のブロッカーを記録している。直近コミットの多くが「Harden…/Fallback…/Gracefully return empty…」という防御的パッチであることと整合する。

### 検証コマンド(現行)

```bash
pnpm install          # postinstall で prisma generate が走る
pnpm typecheck        # tsc --noEmit
pnpm lint             # next lint
pnpm format:check
pnpm test run         # vitest(シングルスレッド設定)
pnpm test:coverage
pnpm build
./scripts/ci.sh       # 上記を一括
```

---

## 3. Behaviors To Preserve(絶対に壊してはいけない挙動)

以下は現行仕様として保存する。変更が必要だと判断した場合は実装せず質問すること。

1. **middleware.ts の認可マトリクス全体**: `/admin/*` は admin ロール必須、`/cast/*` は cast 必須、`*/mypage` はトークン必須。公開API(`/api/public/*`、`/api/line/webhook`、GETの `/api/course`・`/api/option`)、cronルート2本のパススルー、ログインページへの `callbackUrl` 付きリダイレクト。
2. **NextAuth の3プロバイダ**(admin-credentials / customer-credentials / cast-credentials)のログインフロー、JWTセッション、token上の `role`・`adminRole`・`permissions`・`storeId`。
3. **予約作成・空き判定・競合チェック**(`app/api/reservation/route.ts`、`app/api/reservation/availability/route.ts`)の入出力と計算結果。
4. **精算(settlement)関連の計算とAPI**(`lib/settlement/server.ts`、`app/api/admin/cast/settlements/*`、`app/api/cast-portal/settlements`)。直近の開発の中心であり、テストが無い。
5. **ポイント失効cronの契約**: `POST /api/customer/points/expire` が `Authorization: Bearer $CRON_SECRET` または admin セッションで動くこと(GitHub Actions が依存)。
6. **`/staff/:path*` → `/cast/:path*` の permanent redirect**(next.config.mjs)。
7. **Supabase Storage のバケット名 `images`** と既存の保存URL形式(DBに保存済みのURLがある)。
8. **`prisma/seed.ts` の安定ID**(`seed-*`, `course-N`, `option-*` によるupsert冪等性)。
9. **開発環境でのデータ表示のモックフォールバック挙動**(`shouldUseMockFallbacks()` によるデータ取得失敗時のフォールバック)。ただし**認証のデモログインは例外**であり、§8 の決定により削除する(D-8)。
10. **公開店舗ページ**(`app/[store]/*`)のサーバーコンポーネントによるデータ取得と `notFound()` 挙動。

---

## 4. Non-Negotiables(禁止事項)

- 型を緩めて(`any` 追加、型アサーション追加、`===`→`==`)エラーを消さない。
- テストのskip・削除・アサーション弱体化で通さない。既存の7件の `it.skip`(`components/reservation/reservation-dialog.test.tsx`)は勝手に解除も削除もしない。
- `// @ts-ignore` / 空catch / エラー握りつぶしを追加しない。
- **DBスキーマ(`prisma/schema.prisma`)とマイグレーションを変更しない**(本指示書の全フェーズで禁止。提案のみ可)。
- `.env` / `.env.production` などの環境変数ファイルを読まない・変更しない・コミットしない。`.gitignore` の `.env*` 除外を変更しない。
- 依存パッケージのバージョンを変更しない(追加も原則しない。必要なら質問)。
- 無関係な整形・「ついで」のリファクタリングをしない。1コミット=1つの論理的変更。
- 証拠(import検索・実行結果)なしにコードを削除しない。

---

## 5. Stop And Ask Conditions(実装を止めて質問する条件)

以下に触れる変更は、実装せずに提案としてまとめ、人間の回答を待つこと。

1. §8 の決定事項(7件、回答済み)の範囲を**超える**判断が必要になった場合(決定に記載のない新たな仕様判断が出てきたら停止して質問)。
2. 公開URL・公開APIのパスや可視性が変わる変更のうち、§8 で承認済みのもの(`app/(public)/` 削除、analytics/upload のロール制限)**以外**。
3. 認証・認可・決済・LINE/メール/SMS通知・cronの挙動に影響しうる変更(§8 で承認済みの D-8 / D-9 を除く)。
4. DBスキーマ・保存済みデータ・シードの互換性に影響しうる変更。
5. テストと実装が矛盾していて、どちらが正しいかコードから判断できない場合。
6. ベースライン(Phase 0)で typecheck / lint / test / build のいずれかが失敗し、その失敗が自分の変更と無関係に大量(目安: 20件超)にある場合 → 修正に着手せず、失敗一覧を報告して方針を仰ぐ。

---

## 6. Baseline Commands(Phase 0 で必ず実行・記録)

```bash
git status                 # クリーンであることを確認。未コミット変更があれば作業しない
git log --oneline -5
pnpm install
pnpm typecheck   2>&1 | tail -30   # 失敗数を記録
pnpm lint        2>&1 | tail -30
pnpm format:check 2>&1 | tail -10
pnpm test run    2>&1 | tail -20   # 現行: 620件中613 pass / 7 skip が期待値
pnpm build       2>&1 | tail -20
```

- 結果を `refactor-baseline.md`(コミットしない、報告に添付)に記録する。
- **以後の各フェーズの合格基準は「ベースラインからの悪化ゼロ」**である。ベースラインで既に失敗しているものを直す義務はない(直す場合は独立コミットにする)。
- DB接続は前提にしない。テストは全てモックで動く設計(`vitest.setup.ts`)なので、実DBなしで全フェーズ遂行可能。

---

## 7. Debt Map(負債マップ)

凡例 — **[実装可]**: 本指示書の範囲で実装してよい / **[承認済]**: §8の決定に基づき実装(Phase 6)/ **[提案のみ]**: 実装禁止、提案文書のみ。

### D-1. ドキュメントと実態の乖離 **[実装可]**(Phase 1)

- **根拠**: CLAUDE.md「repository-implは現状モックデータ」「全データはモック」「カバレッジ100%必須」「ci.shがplaywright実行」— すべて事実と相違。`vitest.config.ts` 閾値は30%、playwrightは不在、主要ドメインはPrisma実装済み。DEVELOPMENT_GUIDE.md はカバレッジを5%/40%と記載し内部矛盾。`docs/PRICING_SYNC.md` は実在しないモデル(AdditionalFee/StorePricing)を記述。`docs/chat-database-implementation.md` のMessageスキーマ断片は現行と不一致。
- **なぜ負債か**: AIエージェント運用(CLAUDE.md駆動)のプロジェクトで、一次情報が嘘をつくと以後の全変更の判断を誤らせる。
- **影響/リスク**: ドキュメントのみの変更。コードリスクゼロ。
- **改善案**: 事実記述を現状に合わせて修正。カバレッジ目標は**30%(現行のenforced値)を正とする**(§8決定)— CLAUDE.md の「100%」、DEVELOPMENT_GUIDE の「5%」、README の「40%」をすべて30%に統一する。`vitest.config.ts` の閾値は変更しない。古い設計文書には冒頭に「HISTORICAL — 現状はXXを参照」の注記を付ける(削除しない)。将来のratchet up(実測が安定して上回ったら閾値を引き上げる)は Phase 7 の提案に含める。

### D-2. ビルド時品質ゲート無効 + 自動CI不在 **[承認済]**(Phase 6)

- **根拠**: `next.config.mjs:13-18`(ignoreDuringBuilds / ignoreBuildErrors)。`.github/workflows/` にビルド/テストCIなし。
- **なぜ負債か**: `ci.sh` を手動で回さない限り、壊れたコードがそのままデプロイ可能。tsconfig は strict なのに強制点がない。
- **改善案(承認済)**: (a) PR/push で `ci.sh` 相当を走らせる GitHub Actions を追加(DB不要でテストが走ることは §6 で確認済み)。(b) typecheck/lint のベースライン失敗を解消したのち `ignoreBuildErrors`/`ignoreDuringBuilds` を外す。**フラグ外しはベースラインが完全にgreenになるまで着手禁止**。greenにできない場合はフラグを維持したまま失敗一覧を報告して終了する(§5-6)。

### D-3. 死コード(証拠あり) **[実装可]**(Phase 2)

- `lib/shared/mock-repository.ts` — `MockRepository` は自身のテストと `shared/index.ts` の再エクスポート以外に参照ゼロ。削除前に `grep -rn "MockRepository" --include='*.ts*'` で再確認し、テストと再エクスポートも同時に削除。
- `scripts/check-db-connection.js` — `require('../lib/generated/prisma')` は `.ts` ファイルを require しており動作しない(壊れている)。package.json から未参照。削除。
- `scripts/seed-chat-messages.ts` と `prisma/seed-chat-messages.ts` の重複 — 内容ほぼ同一。参照(package.json、ドキュメント、workflow)を確認し、参照されている側を残して片方を削除。
- `coverage.json`(リポジトリ直下、254KB のvitest実行レポート) — コードからの参照が無いことを確認の上、削除し `.gitignore` に追加。
- **リスク**: 低。各削除は独立コミットにし、削除ごとに `pnpm test run && pnpm typecheck` を実行。

### D-4. 危険なスクリプト・シードの既定値 **[承認済]**(Phase 6)

- **根拠**: `scripts/create-admin.js` が `admin@example.com`/`admin123` 等3アカウントを固定パスワードでupsertし平文表示。`prisma/seed.ts` も同一の既定パスワード。`env.example` にも `ADMIN_PASSWORD=admin123`。安全な代替 `scripts/setup-admin.ts`(対話式、強度検証、bcrypt rounds=12)が既に存在。
- **改善案(承認済)**: `scripts/create-admin.js` と package.json の `create:admin` エントリを削除し、README等の言及を `setup:admin` に置換。seed のパスワードは既に `env.seed.initialAdminPassword` を優先するため、既定値の扱い(残すか必須化か)は Phase 7 の提案として報告。

### D-5. Prismaクライアントの二重輸入経路 **[実装可]**(Phase 2)

- **根拠**: `lib/db.ts`(`db`)が実体。`lib/generated/prisma.ts` は手書き2行の別名再エクスポート(`export { db as prisma }`)で、「generated」というディレクトリ名も嘘。両経路から同一クライアントが import されている。
- **改善案**: 全 import を `@/lib/db` の `db` に機械的に統一 → `lib/generated/prisma.ts` を削除。純粋な参照置換なので挙動不変。変更後 typecheck/test で検証。

### D-6. ログ・エラーハンドリングの二重体系 **[実装可、段階的]**(Phase 3)

- **根拠**: pino logger(`lib/logger.ts`、約46箇所、主にAPIルート)と console.\*(lib配下15ファイル約30箇所)が並存。中央APIエラーハンドラ `lib/api/errors.ts` 自身が `console.error` を使う。`lib/error-utils.ts` は pino と無関係な console ベースの別系統。`lib/reservation/data.ts` はクライアントバンドル対策で `require('@/lib/logger')` を遅延実行。
- **なぜ負債か**: 本番の構造化ログから漏れる障害情報がある。エラー整形が2系統あり、どちらを使うべきか新規コードが迷う。
- **改善案**: (1) **サーバー専用**モジュール(APIルート、`lib/*/server.ts`、`lib/api/errors.ts`)の console.\* を logger に置換。(2) `lib/error-utils.ts` の利用箇所を洗い出し、`lib/api/errors.ts` 系に寄せられるものは寄せ、クライアント側で使われているものは触らない。クライアントコンポーネント内の console はスコープ外。ログ**文言・レベル**は変えない(監視が依存する可能性)。

### D-7. 重複ロジック **[実装可、1件ずつ]**(Phase 4)

- **JST/タイムゾーン**: `JST_TIMEZONE = 'Asia/Tokyo'` の再宣言・`formatInTimeZone` の個別使用が最低10ファイル(`lib/reservation/repository-impl.ts:15`、`hooks/use-availability.ts:25`、`lib/cast-portal/server.ts`、`lib/cast-schedule/{usecases,utils}.ts`、`lib/store/public-schedule.ts` ほか)。→ `lib/shared/timezone.ts` に定数と共通関数を作り、**呼び出し側を1ファイルずつ**移行(1コミット1ファイル可)。
- **料金データの正規化**: `lib/store/public-pricing.ts` が `lib/pricing/adapters.ts` と重複する Course/Option 正規化(`ensureCourseSerializable` 等)を独自実装。→ adapters に集約。出力が同一であることをテストで固定してから統合。
- **指名料・取り分計算**: `lib/designation/fees.ts`(`normalizeDesignationShares`)と `lib/reservation/revenue.ts` に類似の share 計算。→ まず両者の入出力を characterization test で固定。統合は差分が本当に無いと確認できた場合のみ。**計算結果が1円でも変わる統合は禁止**。
- **空き状況ロジック**: `app/api/reservation/availability/route.ts` / `hooks/use-availability.ts` / `lib/settings/business-hours{,.server}.ts` に分散。クライアント/サーバー境界をまたぐため、**Phase 4では統合しない**。現状のマッピングを文書化するに留める(提案)。

### D-8. モックフォールバックが認証に食い込んでいる **[承認済: 削除]**(Phase 6)

- **根拠**: `lib/auth/config.ts:189-198` — `shouldUseMockFallbacks()` が true のとき、DB照合なしでハードコードされたデモ顧客としてログイン成立。フラグ既定値は「非productionでtrue」だが、本番で env を誤設定すれば有効化できる。
- **なぜ負債か**: 認証コードパスにテスト用ユーザーが埋まっているのはセキュリティ境界の汚染。データ表示のフォールバックとは危険度が違う。
- **改善案(承認済)**: デモログインは**不要と決定**。`lib/auth/config.ts` の customer-credentials 内にある `shouldUseMockFallbacks()` 分岐(デモ顧客 `demo-tanaka` の生成、およびモック顧客データへのフォールバック照合)を**削除**する。手順: (1) 削除前に `lib/auth/config.test.ts` 等でこの分岐に依存するテストを特定し、削除に合わせて更新(テストの弱体化ではなく「デモログインが成立しない」ことの検証に置換)。(2) データ表示側の `shouldUseMockFallbacks()` は触らない(§3-9)。(3) 開発時のログインは seed ユーザー(`prisma/seed.ts` の顧客)で行う旨を README に一行追記。

### D-9. APIルートの認可チェック不統一 **[承認済: 制限する]**(Phase 6)

- **根拠**: `app/api/admin/*` は `requireAdmin`、cast-portal は `requireCast` を自前チェックする一方、`app/api/analytics/*`(例: `analytics/daily/route.ts`)と `app/api/upload/route.ts` はハンドラ内チェックなしで middleware 依存。middleware は `/api/analytics` に「トークンがあること」しか要求しないため、**customer ロールのトークンで店舗売上分析APIを読める**。
- **なぜ負債か**: 認可の実質的な穴+「どの層が認可に責任を持つか」の不明確さ。
- **改善案(承認済)**: (1) `app/api/analytics/*` の全ルートに `requireAdmin()` を追加(admin限定)。(2) `/api/upload` は先に実際の呼び出し元を棚卸しする(`grep -rn "'/api/upload'" app components hooks lib`)— 管理画面(admin)とキャストポータル(chat添付・日記等)が使う場合は admin と cast を許可し customer を拒否。**customer 向けフローが upload を使っていることが判明した場合は停止して報告**(仕様判断が必要)。(3) 変更後、各ロールでの許可/拒否をテストで固定する。

### D-10. 巨大ファイル(単一責務違反) **[実装可、Phase 5、抽出のみ]**

- **根拠**: `components/reservation/reservation-dialog.tsx` **3041行**、`app/api/reservation/route.ts` **1715行**、`app/(admin)/admin/customers/[id]/page.tsx` 1437行、`lib/analytics/server/index.ts` 1233行、`lib/cast-portal/server.ts` 1167行、`components/reservation/quick-booking-dialog.tsx` 1743行。
- **なぜ負債か**: 予約はこの事業のコア。3000行のダイアログと1700行のAPIルートは、直近コミット履歴(hook順序バグ、日付正規化バグの修正)が示す通り、既に不具合の温床。
- **リスク**: 高。テストは reservation-dialog に7件skipがあり信頼できない。
- **改善案**: Phase 1 の安全網を前提に、**振る舞いを変えない抽出のみ**を行う: `app/api/reservation/route.ts` から純粋関数(検証、料金計算、履歴記録)を `lib/reservation/` へ抽出しunit testを付ける。reservation-dialog はまずフォームスキーマ・料金計算・サブセクションUIの抽出まで。**書き換え(rewrite)は禁止**。1回の抽出は300行以内を目安に。

### D-11. analytics の二重実装 / cast-schedule のin-memory実装 **[analytics: 承認済(Phase 6)/ cast-schedule: 提案のみ]**

- **根拠**: `lib/analytics/repository-impl.ts` はモック生成器(客側UIが使用)、`lib/analytics/server/`(1233行)はPrisma実装(APIルートが使用)。cast-schedule の repository-impl は in-memory Map で、実永続化は別途 `app/api/cast-schedule`。`lib/cast-schedule/old-data.ts` / `old-types.ts` は「old」だが `usecases.ts:17-18` から現役参照。
- **なぜ負債か**: 同名の抽象が2つの真実を持ち、どちらを直せばUIが変わるのか非自明。
- **改善案(analytics、承認済)**: 管理画面分析UIを**実データへ接続する**(§8決定)。制約: (a) **1レポート単位**で移行する(例: monthly-sales → daily-sales → …)。(b) 集計ロジックを新規に書かない — 既存の Prisma 実装(`lib/analytics/server/`)とそれを公開する `app/api/analytics/*` を使う。UI側の `lib/analytics/repository-impl.ts` の該当メソッドを、対応するAPIエンドポイント呼び出しに置き換える。(c) 対応するサーバー実装が**存在しない**レポート(現在 `[]` を返すスタブ等)は実装せず、一覧にして報告する。(d) データ取得失敗時の挙動は既存のフォールバック方針(`shouldUseMockFallbacks()`)に合わせる。(e) 各レポート移行ごとに、該当分析ページが描画されること(空データ時含む)をテストで検証する。
- **cast-schedule(提案のみ)**: in-memory Map 実装と `old-data.ts`/`old-types.ts` の整理は Phase 7 の提案文書に含める(現役参照があるため勝手に削除しない)。

### D-12. 型定義の置き場所不統一 **[提案のみ]**

- **根拠**: ドメイン内 `types.ts`(cast, customer, pricing…)と `lib/types/*.ts`(reservation, analytics, chat, daily-sales…)が混在。
- **改善案**: 触るファイルのimport整理のついでにはやらない(no-drive-by原則)。統一方針だけ提案として報告。churn が大きい割に挙動改善ゼロのため、本指示書では実装しない。

### D-13. schema.prisma のモデリング負債 **[提案のみ]**

- **根拠**: status系がすべて文字列(`Reservation.status`、`Message.readStatus` は日本語リテラル`未読`/`既読`)、Json blob多数(`Admin.permissions`、`Message.attachments` 等)、`HotelSettings` が無関連の孤立モデル、softデリートの不統一(`archivedAt` vs `isActive`)、`Store.id` のみ `@default` なし。
- **なぜ提案のみか**: マイグレーションと保存済みデータ互換に直結。§4で禁止。改善ロードマップ(enum化の候補と移行手順)を提案文書として書くこと。

### D-14. テストの空洞化リスク **[提案のみ + 部分対応]**

- **根拠**: `vitest.setup.ts` が db/fetch を空応答でグローバルモックするため、多数のテストが「空配列が返る」ことしか検証していない。`as any` 338箇所の大半がAPIルートテストに集中。settlement・cast-portal・designation(直近の開発中心)はテストゼロ。コンポーネントは133中5のみテストあり。
- **対応**: Phase 1 で settlement / reservation revenue / middleware周辺の characterization test を追加(グローバルモックの枠組み内で、実際の計算ロジックを検証するテストに限る)。グローバルモック体制自体の見直しは提案のみ。

---

## 8. 確定済みの決定事項(2026-07-04 プロダクトオーナー回答)

事前質問7件はすべて回答済み。以下が確定仕様である。**この決定の範囲を超える判断が必要になったら停止して質問すること(§5-1)。**

- **Q1(カバレッジ方針)**: **30%(現行のenforced値)を正とする**。ドキュメント(CLAUDE.md / DEVELOPMENT_GUIDE / README)の 100% / 5% / 40% の記述をすべて30%に統一。`vitest.config.ts` の閾値は変更しない。将来の引き上げは Phase 7 提案。→ D-1
- **Q2(analytics実データ化)**: **進める**。管理画面分析UIを実データ(`lib/analytics/server/` 経由)へ接続する。1レポート単位、集計ロジック新規実装禁止。→ D-11
- **Q3(analytics/upload の認可)**: **限定する**。`/api/analytics/*` は admin 限定。`/api/upload` は呼び出し元棚卸しの上で admin/cast に限定(customer フローで使用が判明したら停止・報告)。→ D-9
- **Q4(デモログイン)**: **不要**。`lib/auth/config.ts` のデモ顧客ログイン分岐を削除する。→ D-8
- **Q5(create-admin.js)**: **削除する**。`setup-admin.ts` に一本化。→ D-4
- **Q6(CI追加とビルドフラグ)**: **両方進める**。PR/push CI を追加し、ベースライン完全green後に `ignoreBuildErrors`/`ignoreDuringBuilds` を解除。→ D-2
- **Q7(app/(public) の削除)**: **削除する**(推奨案を採用)。削除前に内部リンク(`href="/booking"` 等)の grep と、middleware により当該ページが実質到達不能であることの確認を行い、確認結果を報告に含める。

---

## 9. Implementation Phases(この順序で実施)

各フェーズの終わりに §10 の検証を実施し、greenでない限り次へ進まない。フェーズ内も小さいコミットに分割する。

### Phase 0 — ベースライン確立(変更ゼロ)

1. `git status` がクリーンであることを確認。クリーンでなければ**作業を開始せず報告**。
2. §6 のコマンドを全て実行し、結果(失敗数・失敗内容の要約)を記録。
3. §5-6 の条件(ベースライン大量失敗)に該当すれば停止して報告。

### Phase 1 — 安全網(テスト追加のみ、実装コード変更ゼロ)

対象は「重要なのにテストが無い」箇所。既存のモック体制(`vitest.setup.ts`)の流儀に従う。

1. `lib/reservation/revenue.ts` — 現在の入出力を固定する characterization test(代表的な料金・取り分パターン)。
2. `lib/designation/fees.ts` — `normalizeDesignationShares` / `findDesignationFeeBy*` の現挙動固定。
3. `lib/settlement/server.ts` — 純粋な計算部分を特定し、Prismaモック経由で計算結果を固定するテスト。
4. `app/api/reservation/route.ts` — 既存テストのカバー範囲を確認し、バリデーション・競合判定の未カバー分岐を追加。
5. ドキュメント修正(D-1): CLAUDE.md の事実相違4点(モックデータ記述、カバレッジ、playwright、アーキテクチャ説明)を現状に合わせて修正。カバレッジ数値は全ドキュメントで30%に統一(§8 Q1)。古い設計docsへ HISTORICAL 注記。

### Phase 2 — 明らかに安全な整理(D-3, D-5)

1. `coverage.json` 削除 + `.gitignore` 追加(参照ゼロ確認後)。
2. `scripts/check-db-connection.js` 削除(壊れている・未参照)。
3. `seed-chat-messages` の重複解消(参照されている側を残す)。
4. `lib/shared/mock-repository.ts` とそのテスト・再エクスポートを削除(参照ゼロ再確認後)。
5. Prisma import 統一: `@/lib/generated/prisma` の全利用箇所を `@/lib/db` へ置換 → `lib/generated/prisma.ts` 削除。
   各ステップ独立コミット。削除ごとに typecheck + test。

### Phase 3 — ログ/エラー処理の統一(D-6)

1. `lib/api/errors.ts` の console.error → logger。ログレベル・文言は維持。
2. サーバー専用モジュール(`lib/*/server.ts`、`lib/notification/`、`lib/line/` 等)の console.\* → logger。**1ドメイン1コミット**。
3. `lib/error-utils.ts` の利用箇所を調査し、統合可否を報告(統合はサーバー側のみ実施、クライアント側は現状維持)。

### Phase 4 — 重複の解消(D-7、1件ずつ)

1. `lib/shared/timezone.ts` 新設(`JST_TIMEZONE` 定数 + 共通フォーマッタ)。利用側を1〜2ファイルずつ移行。
2. `lib/store/public-pricing.ts` の正規化ロジックを `lib/pricing/adapters.ts` へ集約(統合前後の出力同一性をテストで証明)。
3. 指名料share計算: Phase 1 のテストを根拠に、完全同値と証明できた場合のみ統合。証明できなければ「差分の報告」で終了。

### Phase 5 — 境界の明確化と分割準備(D-10)

1. `app/api/reservation/route.ts` から純粋ロジック(入力検証、料金計算、履歴payload構築)を `lib/reservation/` へ抽出 + unit test。ルートハンドラの入出力は不変。1抽出300行以内、都度検証。
2. `components/reservation/reservation-dialog.tsx` から非UIロジック(スキーマ、料金計算、初期値構築)を抽出。UIの分割は小さなサブコンポーネント抽出まで。
3. `lib/cast-portal/server.ts` / `lib/analytics/server/index.ts` は**分割計画の提案のみ**(関数一覧と提案モジュール構成)。

### Phase 6 — 承認済み作業(§8 の決定に基づく。この順序で実施)

1. **D-4**: `scripts/create-admin.js` と `create:admin` エントリの削除、README等の言及を `setup:admin` へ置換。
2. **D-8**: デモログイン分岐の削除(依存テストの更新を含む。手順はD-8参照)。
3. **D-9**: `/api/analytics/*` へ `requireAdmin()` 追加。`/api/upload` は呼び出し元棚卸し → admin/cast 限定(customer利用が判明したら停止・報告)。ロール別の許可/拒否テストを追加。
4. **`app/(public)/` の削除**(Q7): 事前に (a) `grep -rn 'href="/booking"\|href="/cast"' app components` 等で内部リンク不在を確認、(b) middleware により未認証では `/cast` が login へリダイレクトされる(= 当該ページが実質到達不能)ことを確認し、両方の確認結果を報告に記載してから `app/(public)/` ツリーを削除。ビルドが通り、`/[store]/booking`・`/[store]/cast` が影響を受けないことを確認。
5. **D-2(a)**: PR/push で format:check / lint / typecheck / test / build を走らせる GitHub Actions workflow を追加(既存のcron workflow 2本には触らない)。
6. **D-11(analytics)**: 分析レポートの実データ接続。1レポート1コミット、制約はD-11参照。サーバー実装が無いレポートは一覧報告のみ。
7. **D-2(b)**: 上記すべて完了かつ typecheck / lint がベースラインで完全greenの場合**のみ**、`next.config.mjs` の `ignoreBuildErrors` / `ignoreDuringBuilds` を解除。greenでなければフラグ維持のまま失敗一覧を報告。

### Phase 7 — 提案書の作成(実装なし)

D-11の残余(cast-scheduleのin-memory実装と `old-data.ts`/`old-types.ts` の整理案)、D-12(型配置方針)、D-13(schema改善ロードマップ)、D-14(テスト体制改善)、D-1のカバレッジ閾値ratchet up案、D-4の残余(seed既定パスワードの扱い)を `docs/refactor-proposals.md` にまとめる。

---

## 10. Verification Requirements

- **各コミット後**: `pnpm typecheck && pnpm test run`(最低限)。
- **各フェーズ完了時**: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test run && pnpm build`。
- 合格基準は**ベースライン比で悪化ゼロ**(新規の失敗・新規のlintエラー・skip増加なし)。ベースラインで失敗していた項目は「変わらず失敗」なら合格。
- テスト件数は減らさない(Phase 1 以降は増えているはず)。
- Phase 4-2(pricing統合)は、統合前に固定した出力スナップショットが統合後も一致することを個別に証明する。
- 全フェーズ完了後に `./scripts/ci.sh` を実行し、結果全文を報告に含める。

## 11. Reporting Format

各フェーズ完了ごとに以下を報告する:

```markdown
## Phase N 報告

- 実施内容: (コミット一覧: hash + 1行説明)
- 変更ファイル: (パス列挙)
- 挙動への影響: 「なし」または具体的説明
- 実行した検証コマンドと結果: (コマンド + pass/fail + ベースライン差分)
- 発見した想定外の事実: (あれば)
- スキップ/停止した項目とその理由: (§5該当時)
```

最終報告には、最後に実行した `./scripts/ci.sh` の結果、追加したテストの一覧、および Phase 7 の提案書パスを含める。

## 12. Out-of-scope Items(本指示書ではやらないこと)

- **UI/UXの使いやすさ改善** — 姉妹文書 `ui-improvement-instructions.md` で扱う(トースト配線、luxury CSS修正、ナビゲーション、アクセシビリティ等)。同じファイルに触れるため、推奨順は「本文書 Phase 0–4 → UI版 U1–U7 → 本文書 Phase 5–7」。
- 新機能の実装(hp-pricing / mutual-links / templates の保存API化、リアルタイムチャットSSE、駅別売上、admin側写メ日記管理 — これらは既知の**機能ギャップ**であり、リファクタリングではない)
- DBスキーマ変更・マイグレーション・保存済みデータの変換
- 依存パッケージのアップグレード(Next/React/Prisma等)
- UIデザイン変更(luxuryテーマ等)
- 決済プロバイダの実装(現状 `manual` のまま)
- レガシーPHP管理画面からのETL/データ移行(`docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md` の領域)
- `migrate-images-to-supabase.ts` の改修(一回性スクリプト)
- vitest グローバルモック体制の刷新(提案のみ)
- フォーマットのみの変更、リネームのみの変更

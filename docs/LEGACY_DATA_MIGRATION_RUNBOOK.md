# 旧本番データ移行ランブック

更新日: 2026-08-14

## 現在の判定

現時点は **No-Go（本番切替不可）** です。池袋V5候補artifactについて、snapshot・画像105件・変換後全model／全field SHA-256・Prisma migration 16件をDB非接続で照合し、PIIを含まないowner-only control、report、取込後read-only SQLを生成しました。

2026年8月14日に、隔離previewで更新前backupの復元確認、空DB・storage再作成、V5取込、取込後DB全件突合、公開画像105件のSHA-256照合、移行後backupの隔離復元、application health、主要な公開・管理・顧客画面の技術確認まで完了しました。これは現場確認を開始できることを示しますが、現場承認または本番切替可能性を示すものではありません。

V5取得でも旧本番の稼働・データ・画像・routingを変更していません。旧システムは本番として書込みを継続しているため、`2026-08-14T19:31:10+09:00` より後の更新はsnapshotへ含まれません。最終切替では、旧側のcoordinated write pause、共有会員DBを含むlocked final extract、画像差分取得、全件突合を改めて実施します。

### 2026-08-14 池袋V5検証結果

| 項目                     | 検証値                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| データ基準日時           | `2026-08-14T19:31:10+09:00`                                        |
| V5 snapshot SHA-256      | `12bf7fd7b165f3c697adbfe82390f2f5188433bf03ccf0e871f289029dc1cd9b` |
| 画像manifest SHA-256     | `58e23753728587566619bb92df96ac7e6af83090b75398509110d28dae219616` |
| 画像                     | 105件、9,794,316 byte、SHA-256・MIME・寸法・inventory一致          |
| 変換後fixture SHA-256    | `00a0211ae87c5c254717c1b93ca0de37d89aca71d6d4b8d53af745b7438c4abd` |
| redacted control SHA-256 | `2c822b626afa9ad4db6604e666655dfe60acfaff4bd6aa3ed1e561de33725703` |
| Prisma migration         | 16件の名前・内容SHA-256完全一致                                    |

V5変換後の主要期待件数は `Customer=13,313`、`Cast=35`、`CastSchedule=241`、`Reservation=2,122`、`ReservationOption=3,753`、`Review=261` です。`legacy-cast-56060` と `legacy-cast-56229` は存在し、画像参照はそれぞれ4枚・3枚でmanifest実fileと一致します。QA顧客には完了予約15件が紐付きます。詳細な全model件数とaggregateは[現場確認環境チェックリスト](./PREVIEW_UAT_CHECKLIST.md)に固定します。

取込直後のlive previewと移行後backup復元先は、ともに `V5_FULL_DATABASE_RECONCILIATION_OK` を返しました。画像は双方で105件・9,794,316 byteがmanifestのSHA-256と一致しました。移行後backupは `/opt/platinum/maintenance/salon-preview/post-v5-20260814/` 配下へ暗号化・owner-onlyで保存しています。

この成功は `ikebukuro-preview-artifact` と隔離previewの取込直後状態に限ります。稼働中の旧本番と同一時点の全件性、未取得domain、現場での業務上の正しさ、本番切替可能性は証明しません。技術確認用の `[UAT]` 書込み開始後はlive件数が基準値から増えるため、全件突合の正本は移行後backupの隔離復元結果とします。

### 2026-07-28 池袋V4 snapshot・画像取得結果

旧店舗DB `nzuadtjn_gold_master` と会員DBから、池袋 `shop_no=5600` を読み取り専用で取得しました。V4は顧客台帳を含みますが、旧password、ポイント履歴、NG履歴は取得しません。対象tableはMyISAMのためtransactional snapshotではありません。取得前後のtable件数一致を確認したbest-effortな現場確認用copyであり、最終切替時はcoordinated write pause中のlocked extractが必須です。

artifactはGit管理対象外のprivate作業領域へ置きます。credentialを含むprivateファイルの内容を追跡対象文書、チケット、チャット、ログへ転記してはいけません。

| artifact              | 証跡                                                               |
| --------------------- | ------------------------------------------------------------------ |
| データ基準日時        | `2026-07-28T19:10:28+09:00`                                        |
| V4 snapshot SHA-256   | `cce2d631fd36e70da9fcb91c55c162b678472bea239d4aec8e7430f924e8d1f5` |
| 画像manifest SHA-256  | `8abf7014d22dc151c8467db3be74f6291ae139748881f045ee73c62cd1ab782b` |
| 画像                  | 112件、10,404,123 byte、全件SHA-256一致                            |
| 新システム上の画像URL | `/salon-uploads/casts/ikebukuro/...`                               |
| 公開画面の確認対象    | `https://salon.c-platinum.com/ikebukuro`                           |
| 管理画面の確認対象    | `https://salon.c-platinum.com/admin/login`                         |

| 取得元対象         | 行数・範囲                    |
| ------------------ | ----------------------------- |
| 店舗               | 1                             |
| コース             | 13                            |
| 有料オプション     | 7                             |
| 無料オプション     | 4                             |
| エリア             | 1                             |
| 駅                 | 7                             |
| ホテル表示グループ | 1                             |
| ホテル             | 2                             |
| キャスト           | 38                            |
| 顧客               | 13,226                        |
| 出勤               | 210（2026-07-21〜2026-08-25） |
| 予約               | 1,049（2026-04-21以降）       |
| 口コミ             | 259                           |
| キャスト公開画像   | 112                           |

### V4取込後の検証値

| 対象                     | 検証件数 |
| ------------------------ | -------: |
| 店舗                     |        1 |
| 管理者                   |        2 |
| 顧客                     |   13,227 |
| コース                   |       13 |
| オプション               |       11 |
| キャスト                 |       38 |
| キャスト別オプション設定 |      280 |
| 出勤                     |      210 |
| 予約                     |    1,049 |
| 予約オプション           |    1,858 |
| 口コミ                   |      259 |
| ポイント履歴             |        0 |
| NG設定                   |        0 |
| 予約変更履歴             |        0 |
| キャスト公開画像         |      112 |

`Customer=13,227` は旧会員行13,226件と、予約・口コミから参照された会員台帳欠落IDの確認用補完1件です。QA顧客は旧会員行のうち1件を確認用ログインへ割り当て、紐付く完了予約10件の履歴表示をbrowserで確認済みです。この10件は予約変更履歴ではありません。

顧客aggregateの検証値は次です。

- account status: `active=13,184`、`blocked=28`、`pending=4`、`withdrawn=10`、`unknown=1`
- membership stage: `regular=13,216`、`silver=8`、`gold=2`、`platinum=1`
- member type: `vip=11,814`、`regular=1,413`
- security: 電話・メール文字列は各13,227件で重複なし、SMS・メール通知は全件無効、QA顧客1件だけログイン可能・メール確認済み、QA以外13,226件は無効credential、旧passwordは0件

旧値の不足により、生年月日4件、登録日時71件、電話番号12件をpreview用に補完します。メールは形式不正・欠損が多数あり、小文字化・重複排除をしても本番ログインIDや通知先として承認できません。`nameKana` はフリガナ専用の旧値がないため、多くの顧客で氏名をそのままコピーします。

### V4リモート実施状況

| 工程                                | 状況・証跡                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| 更新前preview DB・storage backup    | `/opt/platinum/maintenance/salon-preview/20260728T104001Z-pre-v4-customer-refresh-*`、暗号化成功  |
| 更新前backupの隔離完全復元          | 成功。`Customer=1,007`、`Reservation=1,047`、storage 113 files・10,404,226 byteで一致             |
| preview DB・storageの空からの再作成 | 成功                                                                                              |
| Prisma migration                    | 13件適用                                                                                          |
| V4データ・画像112件の取込           | 成功                                                                                              |
| DB全件・aggregate・画像SHA突合      | `FULL_DATABASE_RECONCILIATION_OK`                                                                 |
| 移行後DB・storage backup            | `/opt/platinum/maintenance/salon-preview/20260728T105105Z-post-v4-customer-refresh-*`、暗号化成功 |
| 移行後backupの隔離完全復元          | DBで全件再突合成功。storage復元・画像SHA一致                                                      |
| application                         | healthy                                                                                           |
| 管理画面browser                     | 顧客一覧・検索・詳細、QA完了予約10件、顧客指定timeline氏名表示に成功                              |
| 公開年齢確認・顧客／キャストlogin   | **Pending**                                                                                       |
| 現場確認                            | **Pending**                                                                                       |
| 旧本番                              | 稼働継続。V4作業による書込み・routing変更なし                                                     |

更新前storageの113 filesは、公開画像112件とpreview target marker 1件です。

切替可能になる条件は、次のすべてを満たすことです。

1. 新システムのCI、主要操作、外部連携の本番相当テストが成功する。
2. 移行対象店舗と旧店舗キーから新 `Store` への対応表を承認する。
3. 旧側のcoordinated write pause中に、共有会員DBと画像差分を含めて取得したlocked final extractで、移行をステージング上に再現できる。
4. 件数、金額、ポイント、未来予約、出勤、画像、ログイン移行を突合し、未解決差分がゼロになる。
5. 切替担当、書込停止時間、ロールバック判断者を決める。

### 現在残っている主要ブロッカー

- 2026-08-14の池袋V5 extractorは今回の限定datasetを厳格変換できるが、書込み停止後の全origin・全tableを対象とするproduction-gradeの raw snapshot → canonical extractorの代替ではない。現行runnerのraw tableとcanonical exportの結合はtable別件数までで、raw主キー／raw row digestの完全なset照合は未実装である。実装・受入条件は[旧データextractor完全性契約](./LEGACY_EXTRACTOR_CONTRACT.md)に固定する。
- 今回の取得対象tableはMyISAMであり、`START TRANSACTION WITH CONSISTENT SNAPSHOT` では行を凍結できない。取得前後の件数一致は同一件数の更新を検知できないため、今回のsnapshotは現場確認用のbest-effort copyに限る。最終切替では旧アプリの書込みを停止してlocked extractを取得する。
- 中央会員DBと店舗DB群を同じcutoffへ揃える取得方式が未承認である。単一DB transactionでない場合は、書込停止または検証可能なhigh-water mark／追補logが必要になる。
- オプションはマスタ、キャスト別設定、予約時点snapshotへ正規化したが、旧予約の最大3コース、値引き・指名料・交通費・場所・配分を、現行の1予約1コースモデルへ損失なく保存する最終規則は未承認である。
- 24〜29時表記、削除済み予約、出勤status 0〜9、休日行、同一cast同日複数出勤の最終変換規則が未承認である。
- V5は顧客台帳を含むが、予約は2026-01-01以降だけであり、ポイント履歴、NG設定・履歴、予約変更履歴は未移行である。現在残高だけを全履歴の代替にしてはいけない。
- 旧会員行の生年月日4件、登録日時71件、電話65件と参照先台帳欠落顧客1件はpreview補完値を含み、多数の旧メール形式不正と `nameKana` の氏名コピーも含む。本番投入前に補完・修正・本人確認の方針が必要である。
- 全店共通会員の統合、重複・欠損連絡先、退会／blacklist／店舗membership、通知同意の意味を決めていない。
- V5はオプションと口コミを変換対象に含めたが、NG設定、ポイント履歴、チャット、精算、日報、削除履歴、非公開画像など、未対応domainの保存先または参照専用アーカイブ方針が未決である。
- V5のリモートbackup、空DB・storage再作成、取込、全件突合、移行後backup復元、主要画面確認は実施済みである。ただし現場担当者の業務・視認性確認と最終切替時の再実施は未完了である。
- 公開画像105件はV5ローカルpackage、live preview storage、移行後backup復元先で全件一致した。非公開画像は対象外であり、正式移行の扱いは未決である。
- 旧入金は予約単位ではなく月次台帳である。`scripts/extract-gold-master-ikebukuro-preview.php` の `LEGACY_PREVIEW_EXTRACT_KIND=cast-ledger` が同じ店舗DB origin の `nyukin` / `shukkin` / `office_pay` と `shop_list.girls_jikyu` を読み取り専用抽出し、`pnpm preview:import-ikebukuro-ledger` が既存previewへ `CastLedgerEntry` と時給保証単価だけを足す。予約紐付けの `SettlementPayment` には押し込まない。未取込キャストの行は捨てる。同じ origin の年次表 `nyukin_YYYY` は現行 `nyukin` が空のため台帳抽出に含める。`shukkin_YYYY` はこのDBに存在しない。SK-DB の `girls_charge_out` 保証実績は、別 origin 契約が承認されるまで対象外。全件再取込はUAT行を消すため使わない。
- V5の出勤は2026-08-01〜2026-09-30だけであり、それ以前の日報の勤務時間は完全にならない。旧媒体番号から姫予約へ分類する対応表と、手取り・店舗売上の正式配分規則も未承認である。

## 絶対に守ること

- 移行作業から旧本番DBと旧サーバーへは、切替承認まで読み取り専用で接続し、更新処理を実行しない。旧アプリの通常書込みは、最終取得のcoordinated write pauseまで継続する。
- `/Users/pon/dev/gambit-front/db_sync.php` は実行しない。DBをDROPして再作成する処理を含む。
- 旧リポジトリに含まれるDB、OAuth、SMS、Notion、Basic認証などの秘密情報を新環境へコピーしない。切替時にすべて新規発行・ローテーションする。
- SQL dump、CSV、画像、移行レポートをGitへ追加しない。暗号化された作業領域に置き、アクセス権と保存期限を設定する。
- snapshot package rootは実行UID所有の `0700` 相当、全artifact・policy・manifest・controlは実行UID所有の `0600` またはowner-read-only相当とする。group/other権限、別UID所有、symlinkは検証時に拒否する。
- 旧会員の平文パスワードを移行しない。ログやエラーレポートにも出力しない。
- 本番DBへ直接変換処理をかけない。必ずオフライン変換、ドライラン、ステージング投入を先に行う。
- 移行処理は同じ入力から何度実行しても同じ結果になるようにし、旧IDと新IDの対応を保存する。

## `gambit-front` 読み取り専用確認結果

2026-07-19にローカルの旧リポジトリを静的確認しました。旧アプリの実行、SSH、DB接続、同期処理、ファイル変更は行っていません。

- リポジトリはPHPアプリ本体と画像群を含みますが、現行本番DBの一貫性スナップショットやDDL dumpは含みません。
- `db_sync.php` は接続先のテーブルをDROPして複製する同期ツールであり、移行の抽出手段として使用禁止です。
- `admin/data_csv` にあるCSVは2015〜2016年の古い会員系exportで、現行本番の正本ではありません。パスワード列を含むため、内容を移行入力・fixture・Git管理対象にしてはいけません。
- 静的SQL参照から、少なくとも `girls`（キャスト）、`member`（会員）、`orders`（予約）、`yotei` / `yotei_data`（出勤）、`charge_info`（コース）、`options`（オプション）、`member_point`（ポイント）の候補を確認しました。
- 旧構成は複数サイト・複数DBです。テーブル名が同じでも対象店舗が異なる可能性があるため、対象DB・サイト・店舗キーを承認するまで結合しません。

したがって、最終移行の作業入力は旧リポジトリそのものでも2026-07-28のV4／2026-08-14のV5 preview snapshotでもなく、本番担当者がcoordinated write pause中に取得する「schema-only dump、共有会員DBを含むlocked final extract、画像manifest、各SHA-256、cutoff時刻」です。秘密情報ファイルや旧パスワードはsnapshot packageから除外します。

## 移行前に決める事項

### 店舗対応

旧DB名、旧サイト、`shop_rid`、`shop_no` などの組を、一つの新 `Store.id` / `Store.slug` / `Store.timezone` に明示的に対応させます。各 `storeMappings` には承認済みの `targetStoreId`、canonicalな `targetStoreSlug`、`targetStoreTimezone: "Asia/Tokyo"` を必須で記録します。slugは小文字英数字をハイフンで区切るcanonical形式とし、推測や既定店舗への自動振り分けは禁止します。未対応の店舗キーが1件でもある場合、または事前配置済みStoreのID・slug・timezoneを含む投影が承認値と完全一致しない場合は、ドライランまたはpreview投入を失敗させます。現行v1マニフェストは、一つの `sourceKey` 内で旧店舗と新店舗の1対1対応を強制し、複数の旧店舗を同一の新店舗へ自動統合しません。

### 会員ログイン

旧システムは電話番号と旧パスワード、新システムはメールアドレスとbcryptパスワードを前提にしており、そのままでは互換になりません。切替前に次のどちらかを選びます。

- 電話番号ベースの新ログインと安全な本人確認・パスワード再設定を実装する。
- メール登録とパスワード再設定を全会員に案内し、完了率を切替条件にする。

どちらの場合も、旧平文パスワードは投入しません。
現在の匿名SMS引継ぎは、旧会員の対象判定とメール本人確認を安全に保証できないため無効です。承認済みの引継ぎ方式を別途実装するまで、旧会員は店舗対応と承認済みの再設定手順へ誘導します。

### 新スキーマにない業務データ

日報、入出金の一部、スタッフシフト、日記、コメント、お気に入りなどは、新スキーマに完全な保存先がありません。各データを以下のどちらにするか業務責任者が承認します。

- 本番必須として新モデル・API・画面を実装してから移行する。
- 参照専用の監査アーカイブへ保存し、新システムでは更新しない。

黙って破棄する選択肢は設けません。

## スナップショット取得

本番アクセス権を持つ担当者が、承認済みの保守時間に実施します。

1. 対象DBと年次テーブルを列挙する。現行テーブルだけでなく、`orders_YYYY`、`member_point_YYYY`、`yotei_YYYY` などを含める。
2. MySQLの一貫性スナップショットを、ロック影響を抑えた読み取り専用手順で取得する。
3. 公開画像と非公開画像を区別してサーバーからコピーする。
4. dumpと画像一覧のSHA-256、取得時刻、対象DB、対象期間、実行者を記録する。
5. スナップショットを読み取り専用にし、ステージング担当へ安全な経路で渡す。

認証情報をコマンドライン引数、シェル履歴、CIログへ残してはいけません。リポジトリ内の古いCSVやXLSXは、変換テスト用の匿名化fixture以外には使用しません。

## 変換契約

現行のDB行変換ツールは、DBへ接続せずに次の入力を処理します。これはMySQL dumpや本番snapshotを直接読み取るextractorではなく、事前に承認済みのcanonical JSONへ変換されたデータ専用です。

- バージョン付き移行マニフェスト
- 店舗対応表
- 旧DBからエクスポートした行データ

snapshot package v1は、raw table、schema-only SQL、deploy済みstatic catalog、canonical export、任意の公開画像manifestを、それぞれexact byteのSHA-256へ固定します。canonical exportはpackage内のartifactを正本とし、同件数・同table名でも別内容の外部exportはpreview DBへ接続する前に拒否します。policyの `requiredTables` は全tableのorigin、物理名、`canonical-source | reconciliation-only` を固定し、manifestとの完全一致を要求します。row count 0のpartitionもpackage検証対象ですが、canonical行に必須のsource table一覧からは除外します。policyはextractor版と変換policy版もexact値へ固定します。

v1の `transaction-snapshot` は一つのoriginだけを許可します。異なるoriginを一つのtransactionとして自己申告するpackageは拒否します。このため、中央会員DBと店舗DBを跨ぐ `gambit-front` 全体のpreviewは、単一transaction domainで取得できることが本番担当者により証明されるか、origin別証跡・high-water mark・追補logを検証するcoordinated-cutoff契約を追加するまで実行できません。単一originだけの部分previewを全データ移行済みと表示してはいけません。

packageをオフライン検証する入口は次です。このコマンドはDB、SSH、旧サーバーの接続引数を受け付けません。
成功reportの `evidenceScope` は意図的に `artifact-integrity-only` です。これはpolicyで宣言したartifactのbyte・件数を検証した意味であり、raw行とcanonical行の完全なset一致や「旧データを全件コピー済み」を証明しません。

```bash
pnpm migration:legacy:verify-snapshot -- \
  --package-root /secure/read-only/snapshot-package \
  --manifest snapshot-package.manifest.json \
  --policy /secure/approved/snapshot-policy.json
```

policyは少なくとも次を含みます。`requiredTables` は「見つかったtable」から自動的に縮めず、schema inventoryと対象期間を確認した承認者が、空のbase／年次tableと照合専用replicaも含めて固定します。

```json
{
  "version": 1,
  "expectedSourceKey": "approved-source-key",
  "expectedAuthoritativeOrigin": "approved-single-transaction-origin",
  "expectedExtractorVersion": "gambit-canonical-v1",
  "expectedTransformationPolicyVersion": "legacy-preview-policy-v1",
  "requiredTables": [
    {
      "origin": "shop_gold",
      "physicalTable": "orders_2025",
      "usage": "canonical-source"
    },
    {
      "origin": "shop_gold",
      "physicalTable": "orders_replica_2025",
      "usage": "reconciliation-only"
    }
  ],
  "expectedSchemaOnlySqlSha256": "<64文字の小文字SHA-256>",
  "expectedStaticCatalogSha256": "<64文字の小文字SHA-256>"
}
```

画像ファイル一覧とチェックサムは現行v1行変換形式とは別契約です。preview専用の画像処理はDB投入CLIへ統合済みで、manifest検証、prepared Castとの明示的な対応付け、全sourceの事前照合、preview storageへの排他的なstream copy、同一checksumの再実行、当該実行が新規作成したfileだけのrollbackを提供します。copy失敗後に対象fileが存在しないことまで証明できない場合も残存状態として拒否します。DBとvolumeは一組の破棄可能targetとして扱い、残存状態または画像copy後のDB失敗では両方を空から作り直します。

画像manifest v1の各fileは、`sourcePath`、canonicalな `casts/...` の `targetPath`、SHA-256、byte数、`public` visibilityに加え、次を必須とします。

- `owner`: `sourceKey`、`entity: "casts"`、`<origin_alias>.<physical_table>` の完全修飾table、同table prefix付きopaque旧IDを含む。pathからownerを推測しない。
- `slot`: 1から15。prepared Castの `images` の順番と一致し、主画像はslot 1とする。
- `mediaType`: `image/jpeg`、`image/png`、`image/webp` のいずれか。target拡張子も一致させる。
- `width` / `height`: 正の整数。copy前にfile headerから検出した実MIME・実寸法と照合する。

prepared Castの `image` / `images` は、manifestの `targetPath` に対応する `/salon-uploads/<targetPath>` と最初から完全一致しなければなりません。画像処理はprepared record、row hash、prepared digestを書き換えません。未参照file、manifestにないURL、gallery内重複、別Cast間の使い回し、owner不一致、slot不一致、sourceKey/cutoff不一致を1件でも検出した場合は、targetへ1byteも書きません。

未検証のmetadataを受理済みと誤認しないよう、行exportのトップレベルでは `sourceKey` と `rows` 以外を、移行マニフェストではv1にない全fieldを拒否します。ステージングpreview準備では別controlとして、cutoff時刻、移行マニフェスト・canonical JSON・snapshot manifestのSHA-256、7配列すべての承認済み入力件数、`sourceKey`、extractor版、変換policy版を照合します。SHA-256は小文字16進数64文字、版は空白なしの明示値でなければなりません。全配列が空のsnapshotは、承認件数がすべて0でも事故として拒否します。この準備処理は純粋な検証・hash生成だけであり、DBへは書き込みません。

```json
{
  "version": 1,
  "sourceKey": "approved-source-key",
  "cutoffAt": "2026-07-28T10:10:28.000Z",
  "migrationManifestSha256": "<店舗対応を含む移行manifestの小文字SHA-256>",
  "canonicalExportSha256": "<canonical JSONの小文字SHA-256>",
  "snapshotManifestSha256": "<検証済みsnapshot manifestの小文字SHA-256>",
  "extractorVersion": "gambit-canonical-v1",
  "transformationPolicyVersion": "legacy-preview-policy-v1",
  "approvedSourceTables": [
    "member_primary.member",
    "member_primary.member_point_2025",
    "shop_gold.charge_info",
    "shop_gold.girls",
    "shop_gold.orders_2025",
    "shop_gold.shops",
    "shop_gold.yotei_2025"
  ],
  "expectedInputCounts": {
    "stores": 1,
    "courses": 1,
    "casts": 1,
    "customers": 1,
    "reservations": 1,
    "castSchedules": 1,
    "pointHistories": 1
  }
}
```

現行v1のすべての中間出力行には「`sourceKey`、canonical entity名、`source_table`、旧主キー」を含む一意な移行元参照を付けます。`source_table` は必ず `<origin_alias>.<physical_table>` の2要素で完全修飾します。年次テーブルやDB間では同じ数値IDが再利用されるため、extractorは `${source_table}:<行を一意にする値>` 形式の衝突しないopaque IDを `id` と外部参照列へ出力しなければなりません。`source_table` とprefixが一致しないID、裸のtable名、SQL断片を含むtable名はpreview準備で拒否します。変換後の外部参照は、照合済み親行の `source_table` を引き継ぎます。検証不能な行は推測で補わず、行番号と理由をエラーレポートへ記録します。レポートへ氏名、電話、メール、パスワード、旧IDなどの値そのものは出しません。

`approvedSourceTables` は検証済みsnapshot manifestのうち、`usage="canonical-source"` かつrow countが1以上のtableだけから機械生成した、昇順・重複なしの完全修飾一覧です。`reconciliation-only` と空partitionはchecksum・件数を検証してもこの一覧へ入れません。canonical行の `source_table` が一覧にない場合、または一覧にあるtableをcanonical行が1件も使用しない場合は、packageと変換結果の取り違えとしてpreview準備を停止します。この一覧、3つのSHA-256、extractor版、変換policy版、各行hash、突合結果をprepared digestへ含めます。

基本の投入順は次のとおりです。

1. 店舗と店舗設定
2. 料金、オプション、エリア、駅、ホテルなどのマスタ
3. キャスト
4. 顧客とNG設定
5. 出勤予定
6. 予約、予約オプション、予約履歴
7. ポイント履歴と残高
8. 口コミ、メッセージ、精算など承認済みの関連データ
9. 公開画像と非公開画像

インポーターは旧ID対応表を使って外部キーを解決し、未解決参照、重複した移行元キー、店舗をまたぐ参照をエラーにします。本番投入は、ドライランのエラーがゼロになってからだけ許可します。

### 現在のオフライン変換形式

設定例は [`docs/examples/legacy-migration-manifest.example.json`](./examples/legacy-migration-manifest.example.json)、入力例は [`docs/examples/legacy-migration-export.example.json`](./examples/legacy-migration-export.example.json) にあります。入力は1つの `sourceKey` と、次のcanonical snake_case行配列を持つJSONです。

| 配列             | 必須列                                                                                                                                            | 任意許可列                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `stores`         | `source_table`, `id`, `name`, `is_active`                                                                                                         | `display_name`, `phone`, `email`, `address`, `created_at`                                       |
| `courses`        | `source_table`, `id`, `store_id`, `name`, `duration`, `price`, `is_active`, `enable_web_booking`                                                  | `store_share`, `cast_share`, `description`, `archived_at`                                       |
| `casts`          | `source_table`, `id`, `store_id`, `name`, `panel_designation_rank`, `regular_designation_rank`, `net_reservation`, `work_status`                  | `age`, `height`, `bust`, `waist`, `hip`, `type`, `image`, `images`, `description`, `created_at` |
| `customers`      | `source_table`, `id`, `name`, `phone`, `member_type`, `points`, `sms_enabled`, `email_notification_enabled`。`email` がない行は投入不可として報告 | `name_kana`, `email`, `birth_date`, `created_at`, 下記の破棄専用credential列                    |
| `reservations`   | `source_table`, `id`, `store_id`, `customer_id`, `cast_id`, `course_id`, `start_time`, `end_time`, `status`, `price`, `points_used`               | `notes`, `created_at`                                                                           |
| `castSchedules`  | `source_table`, `id`, `cast_id`, `date`, `start_time`, `end_time`, `is_available`                                                                 | なし                                                                                            |
| `pointHistories` | `source_table`, `id`, `customer_id`, `type`, `amount`, `balance`, `source_order`, `is_expired`, `created_at`                                      | `reservation_id`, `description`, `expires_at`                                                   |

`rows` 配下に上表以外の配列がある場合、各配列にオブジェクト以外の行がある場合、表にない列が行に1つでもある場合、または許可されていないトップレベル項目がある場合は、変換前の入力エラーとして停止します。公開変換関数を直接使用した場合も、その行をエラーとして拒否します。列名の誤記や未対応データを黙って無視しません。

`customers` の `password`, `passwd`, `pwd`, `password_hash` だけは、旧credentialを中間出力から明示的に破棄して警告するための入力列として許可します。値を新システムへ引き継ぐ用途ではありません。それ以外のcredential列名は未対応列として拒否します。

`panel_designation_rank` と `regular_designation_rank` は0以上の明示値を必須とし、欠落時に0を補いません。旧 `girls.lev_simei` / `girls.flg_repeat` は指名時の手取りUP料金区分であって公開順位ではないため、この2列へ変換してはいけません。旧画面の順位は完了予約から期間別に動的集計されていたため、業務責任者が集計期間、対象状態、指名種別、同順位の規則を承認した派生データ、または明示的に承認した0だけを入力します。

通常のオフライン変換では `created_at` がない行も不足値として中間出力できますが、preview準備では `casts`、`customers`、`reservations` の `created_at` を必須にします。`stores` の任意 `created_at` と、これらおよびpoint履歴の作成日時がcutoffより後なら拒否します。未来の予約施術時刻と出勤予定は正常なので拒否しません。DBの `now()` で旧作成日時を捏造しません。

point履歴の `source_order` は、extractorが全base／年次partitionを統合した後に顧客ごとに確定する一意な非負整数です。同じ秒の複数eventもこの順序で判定します。Customer残高と各履歴残高は0以上、`earned` は正、`used` / `expired` は負、`adjusted` は0以外を必須とします。重複、日時の逆転、`current.balance !== previous.balance + current.amount`、最大 `source_order` の残高とCustomer残高の不一致は、いずれも顧客単位で移行を停止します。最初の履歴以前からの持越し残高は0と仮定せず `first.balance - first.amount` から導出し、非負のPostgreSQL `Int` に収まらなければ停止します。この持越し残高は実snapshot上の顧客別突合で別途監査・承認します。予約の `points_used` が正なら、同じ予約に結び付く `used` eventがちょうど1件あり、その `amount` が `-points_used` と完全一致しなければpreview準備を停止します。逆に `points_used = 0` の予約へ `used` eventが結び付いている場合も停止します。期限/FIFOロットの業務方針が承認・照合されるまでは自動失効を有効化しません。

`courses.store_id` は同じexport内で正常変換された `stores.id` を参照しなければなりません。コースの公開状態は推測せず、`is_active` と `enable_web_booking` を必須とします。`archived_at` があるコースを公開中またはWeb予約可能として入力した場合は拒否します。数値はPostgreSQL `Int` の範囲を超えた時点で拒否します。

canonical形式への変換成功と、Prismaへの投入可否は別に判定します。現行の投入可否ゲートは、Prismaで非NULLの次の項目に安全な値がない行を `MISSING_TARGET_REQUIRED_FIELD` として報告します。

- `Cast`: `age`, `height`, `bust`, `waist`, `hip`, `type`, `image`, `description`, `panelDesignationRank`, `regularDesignationRank`
- `Customer`: `nameKana`, `email`, `password`, `birthDate`

v1変換は `Customer.email` を `NFKC + trim + lowercase`、電話番号を国際表記へ正規化し、同じexport内の正規化後重複をエラーにします。複数 `sourceKey` 間の重複統合は未実装であり、そのままでは投入できません。既存の対象DBに対するPrisma migrationは既存値を自動修正せず、非正規形と正規化後重複を検出して停止します。重複会員の正本は業務責任者が明示的に決定し、監査可能な補正データとしてステージング投入前に解決してください。

現行のcanonical形式はキャストの2つの指名ランクを明示入力として保持します。通常のドライランは会員passwordを引き続き `MISSING_TARGET_REQUIRED_FIELD` として扱い、`persistenceAdapterReady=false` のまま本番投入をfail-closedにします。別のpreview DB投入処理だけは、会員ごとに推測不能な無効bcrypt credentialを生成し、旧passwordを一切保存しません。ほかの必須項目やエラーを隠しません。過去の `migrate:images` Supabaseスクリプトは現構成と互換性がなく廃止済みです。新しいfilesystem adapterは隔離preview専用であり、本番画像移行の代替として直接実行してはいけません。

### 複数店舗の会員・ポイント・チャット

旧構成は複数サイト・複数DBですが、新スキーマの `Customer` と `CustomerPointHistory` は店舗所属を持たず、電話番号とメールは全店共通で一意です。次を業務責任者が決めるまで、会員・ポイント・チャットは投入対象にできません。

- 全店共通会員として同一人物を統合するか、店舗membershipを追加するか。
- 旧DB間で電話・メールが重複した場合の正本と分離条件。
- ポイントを全店共通にするか、店舗別にするか。期限切れはFIFOロット配賦・移行・照合が完了するまで無効にする。
- 店舗管理者が閲覧できるチャット範囲と、旧チャットの参照アーカイブ方針。

旧テーブル固有列からこの形式への抽出アダプタは、実スナップショットのDDLと値分布を確認してから店舗・年次テーブル別に固定します。現段階で列を推測して本番dumpへ直接適用してはいけません。

ドライランは次のように実行します。

manifestとcanonical exportは、実行UID所有かつgroup/other権限なしの通常JSON file（`0600`相当）に限定し、symlink、重複JSON key、上限超過、途中変更を拒否します。出力先はworkspace直下の実行UID所有 `0700` の `migration-data/` と `migration-reports/` にある直下 `.json` fileだけです。出力は `0600` で排他的に新規作成し、既存fileを上書きしません。parser・filesystemの詳細、任意の未対応field名、source key、pathはCLI結果とredacted reportへ出しません。

```bash
pnpm migration:legacy:dry-run -- \
  --manifest /secure/read-only/manifest.json \
  --export /secure/read-only/export.json \
  --output migration-data/intermediate.json \
  --report migration-reports/reconciliation.json
```

`migration-data/` の中間出力には移行に必要な個人情報が含まれるため、コマンドは新規ファイルを権限 `0600` で作成し、既存ファイルを上書きしません。`migration-reports/` は旧IDと行データを除いたレポートです。両ディレクトリはGit管理対象外です。

通常のドライランの終了コードは、`1` が入力・実行エラー、`2` が変換成功だが本番永続化ブロッカーありです。汎用dry-runは本番DB投入を許可しないため `persistenceAdapterReady=false` を維持します。隔離preview DBへの書込みは、下記の別コマンドだけが行います。

## ステージング・リハーサル

preview専用Prisma adapterは実装済みです。検証済みpackage、移行manifest、control、環境・operator・DBの3者marker、`*_preview` DB名、DB側 `salon.environment=staging-preview` をすべて照合し、Serializable write transaction、旧ID mapping、受理したsnapshotと変換policyのprovenance台帳、全件再読込、完全一致rerunだけを許可します。Storeは勝手に作らず、事前配置済みの承認StoreがID・canonical slug・`Asia/Tokyo` timezoneを含む全fieldで一致する場合だけ参照します。provenance台帳とmappingはDB側でも更新・削除を禁止し、両者を外部キーで結合します。台帳導入前のmappingが残るDBには後付けせずmigrationを停止するため、そのpreview DBを再作成してください。

汎用canonical v1経路の `migration:legacy:import-preview` と、今回使用する池袋確認用snapshot schema v4経路の `preview:import-ikebukuro` は別です。後者は `StoreSettings`、preview専用 `Admin`、顧客、`OptionPrice`、`CastOptionSetting`、`AreaInfo`、`StationInfo`、ホテル関連、`ReservationOption`、`Review` も投入します。この限定経路はV4/V5の現場画面確認用であり、locked final extractを投入する本番切替経路として使用してはいけません。

V5では、DBへ接続する前に次の非書込みCLIを実行します。snapshotと画像manifestは実行UID所有の `0600` JSON、`migration-data/` は実行UID所有の `0700` directoryに限定します。最初の承認時だけ `--write-control` を使い、以後は同じ引数位置を `--control` に替えて承認済みcontrolとの完全一致を要求します。成功reportにも氏名、電話、メール、画像元pathは出力しません。

```bash
pnpm preview:verify-ikebukuro -- \
  --snapshot /app/migration-data/ikebukuro-preview-v5-20260814.json \
  --image-manifest /app/migration-data/ikebukuro-preview-images-v5-20260814.json \
  --image-source-root /app/migration-data/ikebukuro-preview-images-v5-20260814 \
  --control /app/migration-data/ikebukuro-preview-v5-control-20260814.json \
  --report /app/migration-data/ikebukuro-preview-v5-remote-verification.json \
  --post-import-sql /app/migration-data/reconcile-ikebukuro-preview-v5-remote.sql \
  --ack VERIFY_IKEBUKURO_V5_ARTIFACT_WITHOUT_DATABASE_WRITES
```

VPS runner imageにはこのCLIを同梱しますが、`.dockerignore` は `migration-data` を除外します。private artifactをimageへ焼き込まず、保守作業時だけ暗号化された転送元から `/app/migration-data` へ安全にmountまたはcopyし、所有者・権限を確認します。CLIは自動起動せず、DB URL・SSH・旧本番接続引数を受け付けません。

生成されたSQLは、V5取込後にpreview DBへ到達できる保守用PostgreSQL clientから実行します。SQL自体が `ON_ERROR_STOP`、`REPEATABLE READ READ ONLY`、`salon.environment=staging-preview`、全model件数、ホテル2件がすべて有効であること、migration名／checksum完全集合、外部キー／孤立行、主要aggregate、画像参照件数を検査し、成功時だけ `V5_FULL_DATABASE_RECONCILIATION_OK` を出して `ROLLBACK` します。SQLを手編集した場合は承認対象外とし、再生成します。

preview DBは、この移行だけに使う破棄可能な専用DBでなければなりません。新規投入時は、承認済みの事前配置Storeだけが過不足なく存在し、インポーターが作成する6テーブル（`CoursePrice`、`Cast`、`Customer`、`CastSchedule`、`Reservation`、`CustomerPointHistory`）と、`LegacyMigrationMapping`、`LegacyMigrationRun` の件数がすべて0であることを要求します。完全一致rerun時は、Storeと6テーブルの行が計画どおり過不足なく存在し、mappingが計画件数と完全一致し、run台帳が当該sourceの完全一致する1件だけであることを要求します。別用途のdemo・seed行、計画外Store、mappingのない対象行、別sourceのmappingまたはrunが1件でもあれば停止し、既存DBを補正せず空から作り直します。

このDB全体件数と内容の検査は、read-only preflight、advisory lock取得後のSerializable write transaction内で再度、さらに書込み完了後の同一transaction内で行います。検査間に行が増減した場合や、書込み後の件数・内容が計画と一致しない場合はtransaction全体を失敗させます。

公開画像の検証・排他的copyも同じCLIへ統合済みです。2026-07-28のV4 snapshotと公開画像112件を空のリモートpreviewへ投入し、件数・aggregate・参照・画像checksumの全件突合で `FULL_DATABASE_RECONCILIATION_OK` を確認しました。移行後の暗号化DB・storage backupも隔離復元し、同じ全件突合と画像SHA一致を再確認しています。applicationはhealthyで、管理画面の顧客一覧・検索・詳細、QA顧客の完了予約10件、顧客指定timelineの氏名表示をbrowserで確認済みです。

通常書込みを停止したlocked final extract、raw行との完全なset照合、共有会員DBを含む同一cutoff、店舗別・日別の金額突合、ポイント・NG・予約変更履歴、非公開画像、公開年齢確認、顧客・キャストlogin、現場承認は未完了です。したがって、V4 preview成功を本番切替可能と判定してはいけません。

現場担当者が実施する確認項目と証跡は、[`PREVIEW_UAT_CHECKLIST.md`](./PREVIEW_UAT_CHECKLIST.md) に記録します。このランブックの技術ゲートと、同チェックリストの画面・業務確認の両方が必要です。

ステージングではメール、SMS、LINE、Push、決済などの送信を停止して実行します。

### 現場確認用preview環境の入口保護

現場確認環境は、本番とは別の破棄可能なDB・storage・ドメインに限定します。アプリは次の設定が揃わなければpreview modeで起動しません。

```dotenv
APP_RUNTIME_MODE=preview
OUTBOUND_DELIVERY_MODE=disabled
PREVIEW_ACCESS_GATE_TOKEN=<32文字以上のpreview専用ランダム値>
PREVIEW_TARGET_ID=<preview DB専用の20文字以上のランダムmarker>
# 任意。日付、またはタイムゾーン付きISO timestampだけを設定する。
PREVIEW_SNAPSHOT_CUTOFF=2026-08-14T19:31:10+09:00
```

`PREVIEW_ACCESS_GATE_TOKEN` はブラウザ、URL、Cookie、クライアントJavaScriptへ渡しません。これは利用者認証ではなく、公開reverse proxyから正しいpreview applicationへ到達したことを確認する内部tokenです。reverse proxyはブラウザから届いた同名headerを採用せず、Next.jsへ転送する際に `x-preview-access-gate-token` をサーバー側の値で必ず上書きします。値が完全一致しない直接アクセスは、公開ページやログイン処理より前に汎用404で拒否されます。

池袋V5は旧顧客PIIを含むため、従来のサニタイズ済みpreviewと同じ公開条件で配置してはいけません。公開HP、`/api/health`、公開用画像だけを認証なしで到達可能にし、管理画面、顧客画面、関連APIはapplication認証に加えてidentity-aware proxyまたはVPNの保護範囲へ入れます。外部送信は停止し、旧credential・非公開画像は配置しません。この保護を確認できない場合はV5をリモートへ投入しません。

`PREVIEW_TARGET_ID` はDB側で独立に設定した `salon.target_id` と完全一致させ、DB側の `salon.environment` は `staging-preview` でなければなりません。preview投入adapterは、環境変数、operatorの明示確認、DBから読み取ったmarkerの3値とDB環境が一致するまでwrite transactionを開始しません。本番DBへこのmarkerを設定してはいけません。

画像volumeでは、`/salon-uploads` として配信するexact rootへ次のmarkerを事前配置します。symlinkのroot・marker・親directoryは拒否します。filesystem adapterへ渡すtarget root、operatorが確認したroot、`PREVIEW_TARGET_ID`、marker内targetIdのすべてが完全一致し、root pathに明示的なpreview segmentがあり、`APP_RUNTIME_MODE=preview` と `OUTBOUND_DELIVERY_MODE=disabled` の場合だけcopyできます。

```json
{ "version": 1, "environment": "staging-preview", "targetId": "<20文字以上のpreview専用marker>" }
```

marker file名は既定で `.legacy-preview-target.json` です。source rootとtarget rootは互いに包含しない実directoryとし、snapshot側を読み取り専用でmountします。既存targetはsize・SHA-256・実MIME・実寸法がすべて一致する場合だけ再利用し、不一致なら上書きしません。画像filesystemとPostgreSQLは単一transactionにならないため、後続DB投入に失敗したpreviewはDB・画像volume全体を破棄して空から再作成します。部分成功した環境を継続利用しません。

インポーターは画像0件の場合もtarget root・marker・全file inventoryを必ず検査します。初回はmarker以外のfileが0件、完全一致rerunはmarker以外が今回の画像planと完全一致する場合だけ許可します。予定外file、部分的な旧copy、通常file以外、symlink、inventory検査不能が一つでもあればDBへ接続せず終了コード `2` とし、そのpreview storage volumeを破棄して空から作り直します。

画像の `/salon-uploads` はreverse proxyが直接配信するため、Next.js middlewareでは保護できません。V5へ配置できるのは公開承認済み画像だけです。非公開画像を扱う正式移行UATでは、HTML、API、`/salon-uploads` を同じidentity/VPN gatewayの認証範囲へ入れます。どちらの場合も、Next.js containerのport、画像volume、内部DBへ到達できる別hostnameをインターネットへ公開してはいけません。

画面確認の視認性を妨げる固定の確認環境バナーは表示しません。確認環境であることは、preview専用URL・DB・account、外部送信停止、`noindex, nofollow` と `/robots.txt` の全crawler拒否で識別します。合成データ環境は `[UAT]`、池袋V5実データpreviewは `[確認用]` の旧顧客とQA accountを使用し、移行マスタや予約へ `[UAT]` 操作確認データを残しません。`PREVIEW_SNAPSHOT_CUTOFF` は画面へ表示せず、投入reportと現場承認記録で照合します。`noindex` はアクセス制御ではなく、identity-aware proxy、VPN、application認証の代替にもなりません。

DB marker、preview専用Store、Prisma migration、外部送信停止を別担当者が確認した後、DB投入は次の明示コマンドでのみ実行します。秘密を引数へ渡さず、`DATABASE_URL` と `PREVIEW_TARGET_ID` はpreview専用環境変数から読みます。成功reportは件数とdigestだけで、氏名・連絡先・旧ID・path・credentialを出力しません。

```bash
pnpm migration:legacy:import-preview -- \
  --manifest /secure/approved/migration-manifest.json \
  --export /secure/read-only/canonical-export-copy.json \
  --control /secure/approved/preview-control.json \
  --package-root /secure/read-only/snapshot-package \
  --snapshot-manifest snapshot-package.manifest.json \
  --snapshot-policy /secure/approved/snapshot-policy.json \
  --confirm-database salon_uat_preview \
  --confirm-marker "$PREVIEW_TARGET_ID" \
  --confirm-storage-root "$STORAGE_ROOT" \
  --ack IMPORT_DISPOSABLE_LEGACY_SNAPSHOT_INTO_ISOLATED_PREVIEW
```

コマンドはpackage全artifact、canonical export、公開画像manifestと画像実体を再検証し、画像copyが完了してからDB clientを作成します。画像検証・copy失敗時はDBへ接続しません。画像copy後にDB投入が失敗した場合、または画像rollbackで残存fileの可能性がある場合は終了コード `2` と破棄必須statusを返します。そのDBと画像volumeを両方破棄して空から作り直してください。

DB側では途中失敗、既存mappingの一部欠落、同一旧IDのhash変更、provenance台帳の欠落・差分、自然キー競合、投入後の再読込差分を全体失敗にします。同じpackageの完全一致rerunは新規行を作らず検証だけ行います。成功が証明する画像範囲はpackageの公開画像manifestに含まれるものだけであり、非公開画像、金額、対象外domain、UATまで合格したことにはなりません。

成功reportの `evidenceScope` は、raw→canonical完全性verifierが未実装の現版では `canonical-preview-only` です。これは検証済みcanonical対象を隔離previewへ投入できた証拠であって、現行旧本番データの全件copyや本番切替可能を示しません。失敗reportは `evidenceScope: "none"` です。

1. 空の本番同等PostgreSQLへPrisma migrationを適用する。
2. 同じスナップショットからオフライン変換を2回実行し、出力チェックサムが一致することを確認する。
3. 1回目のインポート後に再実行し、重複作成がないことを確認する。
4. 次の突合表を店舗別・期間別に生成する。
5. 管理画面、公開画面、会員画面で代表ケースを操作する。
6. リハーサルの所要時間を測り、本番の書込停止枠へ収まることを確認する。

### 必須突合

| 項目                 | 合格条件                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| 店舗・キャスト・顧客 | 対象条件ごとの件数一致、未対応店舗ゼロ、重複キーゼロ                         |
| 予約                 | 店舗別・日別・状態別件数が一致し、未来予約の担当・開始・終了・料金が一致     |
| 売上・精算           | 店舗別・日別の合計が一致。差分は丸め規則を含め1件単位で説明可能              |
| ポイント             | 顧客別履歴合計と新残高が一致し、負残高や孤立履歴がゼロ                       |
| 出勤                 | 未来のキャスト別開始・終了・休み状態が一致                                   |
| 関連                 | 外部キー未解決、店舗越境、孤立レコードがゼロ                                 |
| 画像                 | 対象件数とチェックサムが一致し、公開URLの404と非公開画像の公開漏れがゼロ     |
| 認証                 | 管理者と承認済み会員の再設定・ログイン手順が成功し、旧パスワードが存在しない |

自動突合に加え、各店舗から未来予約、ポイント保有顧客、NG設定、複数年履歴を含むサンプルを抽出し、業務担当者が画面で確認します。

## 本番切替

### T-7日まで

- 最終リハーサルと差分解消を完了する。
- TTL、メンテナンス表示、問い合わせ窓口、切替担当表を準備する。
- 新しい秘密情報を発行し、旧値のローテーション時刻を決める。
- 旧システムへ戻す判断基準と期限を承認する。

### T-1日まで

- 旧本番のバックアップ復元テストを完了する。
- 新本番DBを空の承認済み状態にする。
- 移行ツールの版、マニフェスト、チェックサムを固定する。
- 外部通知と決済が停止していることを確認する。

### 切替当日

1. 旧システムをメンテナンス表示にし、DB書込を停止する。
2. 最終DBスナップショットと画像差分を取得する。
3. 固定済みツールで変換・インポートする。
4. 必須突合を実行する。1項目でも未達なら公開しない。
5. 新システムのスモークテストを行う。
6. ルーティングを新システムへ切り替える。
7. 外部通知と決済を段階的に有効化する。
8. 旧システムは書込禁止の参照・ロールバック用として保持する。

## ロールバック

次のいずれかが起きた場合は、承認者がロールバックを判断します。

- 未来予約、ポイント、金額に説明できない差分がある。
- ログイン、予約作成・変更、出勤反映などの主要導線が利用できない。
- 誤通知、誤決済、個人情報や非公開画像の漏えいがある。
- 復旧見込みが承認済み停止時間を超える。

ロールバック時は、新システムの外部送信を止め、新システム公開後に発生した書込を監査用にエクスポートしてから旧ルーティングへ戻します。新旧両方への無計画な二重入力は行いません。復旧後、その書込を旧側へ反映する方法を個別に承認します。

## 保存する証跡

- 承認済み店舗対応表と移行対象期間
- スナップショット・画像・変換出力のチェックサム
- 使用したコード版とマニフェスト版
- 全突合レポートと承認者
- エラー行の件数・理由・解決記録（個人情報の値は除く）
- 切替・ロールバックの開始終了時刻と担当者
- 秘密情報のローテーション完了記録

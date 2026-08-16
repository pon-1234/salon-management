# 現場確認環境（UAT）チェックリスト

このチェックリストは、旧本番を稼働させたまま取得した池袋V5候補データと公開画像を、隔離previewへ再投入して確認するための記録です。preview DBは破棄前提であり、そのまま新本番へ昇格させません。V4の記録は過去のリハーサル証跡として残し、V5の合格判定へ流用しません。

## 現在の判定

V5候補artifactは、DBへ接続しないローカル検証でsnapshot、画像105件、全model件数、全field canonical SHA-256、Prisma migration 16件の完全一致を確認しました。`legacy-cast-56060` と `legacy-cast-56229` もV5に存在します。

2026年8月14日に、preview専用環境でV4更新前backupの隔離復元、空DB・storage再作成、V5取込、取込後read-only SQL突合、画像全件照合、V5移行後backupの隔離復元、application health、主要画面・認証・予約操作の技術確認まで実施しました。旧本番の停止・書込み・routing変更は行っていません。

したがって、池袋V5確認環境は**現場確認を開始可能**です。ただし現場担当者のチェックと業務定義の承認は未完了であり、本番切替は引き続き **No-Go** です。旧本番は現在も通常稼働しています。

### V5リモート実施証跡

| 項目                           | 結果                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| V4更新前DB backup隔離復元      | `Customer=13,228`、`Reservation=1,053`、`Cast=38`、`CastSchedule=211`                                       |
| V4更新前storage backup隔離復元 | 113 files、実file照合成功                                                                                   |
| 空DB・storage再作成            | preview専用DB・volumeとtarget markerを確認して成功                                                          |
| V5 import                      | `Customer=13,313`、`Reservation=2,122`、`Cast=35`、`CastSchedule=241`、`ReservationOption=3,753`、画像105件 |
| live DB全件突合                | `V5_FULL_DATABASE_RECONCILIATION_OK`                                                                        |
| live画像照合                   | 105 files、9,794,316 byte、全SHA-256一致                                                                    |
| V5移行後backup                 | `/opt/platinum/maintenance/salon-preview/post-v5-20260814/` 配下へowner-only暗号化保存                      |
| V5移行後backup隔離復元         | DB全件突合と画像105件・9,794,316 byteの照合成功                                                             |
| application                    | healthy、DB/storage/notifications ready、LINE disabled                                                      |
| noindex                        | HTTP header、meta、`robots.txt` の全拒否を確認                                                              |

上記の全件突合は、V5取込直後の変更されていない基準状態と、その暗号化backup復元先に対して実施しました。その後の画面操作確認では `[UAT]` 専用顧客・予約を追加するため、現在の可変preview DBをV5基準件数と再比較しません。基準状態へ戻す必要がある場合は、移行後backupを別環境へ復元してから判断し、稼働中previewへ破壊的restoreを行いません。

## V5ローカル取得・取込前検証証跡

| 項目                        | V5検証値                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------- |
| データ基準日時              | `2026-08-14T19:31:10+09:00`                                                           |
| 予約対象期間                | 2026-01-01以降                                                                        |
| 出勤対象期間                | 2026-08-01〜2026-09-30                                                                |
| snapshot SHA-256            | `12bf7fd7b165f3c697adbfe82390f2f5188433bf03ccf0e871f289029dc1cd9b`                    |
| 画像manifest SHA-256        | `58e23753728587566619bb92df96ac7e6af83090b75398509110d28dae219616`                    |
| 画像                        | 105件、9,794,316 byte、実fileのSHA-256・MIME・寸法・全inventory一致                   |
| Prisma migration            | 16件、名前と各 `migration.sql` SHA-256を固定                                          |
| 変換後fixture canonical SHA | `00a0211ae87c5c254717c1b93ca0de37d89aca71d6d4b8d53af745b7438c4abd`                    |
| redacted control SHA-256    | `2c822b626afa9ad4db6604e666655dfe60acfaff4bd6aa3ed1e561de33725703`                    |
| 検証範囲                    | ローカルartifact、preview取込直後DB、移行後backup復元先。旧本番の同時点全件性は未証明 |

### V5取込後の期待件数

| モデル                 | 期待件数 |
| ---------------------- | -------: |
| `Store`                |        1 |
| `StoreSettings`        |        1 |
| `Admin`                |        2 |
| `AdminStoreAssignment` |        1 |
| `Customer`             |   13,313 |
| `CoursePrice`          |       13 |
| `OptionPrice`          |       11 |
| `Cast`                 |       35 |
| `CastOptionSetting`    |      257 |
| `CastSchedule`         |      241 |
| `Reservation`          |    2,122 |
| `ReservationOption`    |    3,753 |
| `Review`               |      261 |
| `AreaInfo`             |        1 |
| `StationInfo`          |        7 |
| `HotelSettings`        |        2 |
| キャスト公開画像       |      105 |

上表にない検証対象modelは0件です。`Customer=13,313` は旧会員行13,312件と、予約・口コミから参照された会員台帳欠落IDの確認用補完1件です。確認用ログインへ割り当てるQA顧客には完了予約15件が紐付きます。これは予約そのものの件数であり、`ReservationHistory` は0件です。`legacy-cast-56060` は4枚、`legacy-cast-56229` は3枚のmanifest照合済み画像を持ちます。

### V5リモート実施チェック

- [x] private V5 snapshot・画像manifest・画像実file・Prisma migrationを非書込みCLIで照合した。
- [x] 氏名・電話・メール・画像元pathを含まないowner-only（`0600`）control、report、取込後SQLを生成した。
- [x] V4 previewのDB・storageを暗号化backupし、隔離復元で完全性を確認した。
- [x] preview applicationを停止し、preview専用targetを再確認してDB・storageを空から再作成した。
- [x] コンテナ内で承認済みcontrolとの再照合に成功してからV5を取り込んだ。
- [x] 生成済みread-only SQLが `V5_FULL_DATABASE_RECONCILIATION_OK` を返した。
- [x] DB・storageの移行後backupを隔離復元し、同じSQLと画像SHA照合を再実行した。
- [x] application health、noindex、主要な公開・管理・顧客画面の技術確認を完了した。
- [ ] 現場担当者が末尾の業務・視認性チェックを完了する。

## V4ローカル取得証跡

| 項目                 | 結果                                                               |
| -------------------- | ------------------------------------------------------------------ |
| 版                   | 池袋preview V4                                                     |
| データ基準日時       | `2026-07-28T19:10:28+09:00`                                        |
| データ取得元         | `nzuadtjn_gold_master` と会員DB、池袋 `shop_no=5600`               |
| snapshot SHA-256     | `cce2d631fd36e70da9fcb91c55c162b678472bea239d4aec8e7430f924e8d1f5` |
| 画像manifest SHA-256 | `8abf7014d22dc151c8467db3be74f6291ae139748881f045ee73c62cd1ab782b` |
| 出勤対象期間         | 2026-07-21〜2026-08-25                                             |
| 予約対象期間         | 2026-04-21以降（約3か月）                                          |
| 公開画像             | 112件                                                              |
| 取得整合性           | 取得前後のtable件数一致                                            |
| 取得方式             | MyISAMのbest-effort read-only copy                                 |

対象tableはMyISAMのため、transactionを開始しても行更新を同一時点へ固定できません。取得前後の件数一致は、同一件数の行更新まで検知するものではありません。このsnapshotは現場確認用に限り、最終切替では旧アプリの書込み停止とlocked extractが必須です。

snapshot、画像、認証情報はGit管理対象外のprivate作業領域に保存します。管理者・顧客・キャストの確認用credentialを、この文書、チケット、チャット、URL、ログへ記載しません。

## 合成UATデータで初期化する場合の安全条件

この手順は旧データ取込とは別の、開発用合成データだけを作る非常用手順です。旧本番へは接続しません。対象がpreview専用で、DBが完全に空であることを確認した場合だけ実行します。

`PREVIEW_UAT_ADMIN_PASSWORD`、`PREVIEW_UAT_CUSTOMER_PASSWORD`、`PREVIEW_UAT_CAST_PASSWORD` はprivate環境ファイルから注入し、画面・ログ・Gitへ記録しません。対象確認後、明示承認値 `CREATE_SYNTHETIC_UAT_DATA_IN_EMPTY_ISOLATED_PREVIEW` を指定して `pnpm setup:preview-uat` を実行します。現在の池袋V5確認環境には、この合成データ初期化を使用しません。

## V4リモート実施証跡

| 項目                       | 検証結果                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------- |
| 更新前backup               | `/opt/platinum/maintenance/salon-preview/20260728T104001Z-pre-v4-customer-refresh-*`  |
| 更新前backup暗号化         | DB・storageとも成功                                                                   |
| 更新前DB隔離復元           | `Customer=1,007`、`Reservation=1,047` を含む更新前件数と一致                          |
| 更新前storage隔離復元      | 113 files、10,404,226 byteで一致                                                      |
| 空DB・storage再作成        | preview専用targetを確認して成功                                                       |
| Prisma migration           | 13件適用                                                                              |
| V4 import                  | 成功                                                                                  |
| live全件突合               | `FULL_DATABASE_RECONCILIATION_OK`                                                     |
| 移行後backup               | `/opt/platinum/maintenance/salon-preview/20260728T105105Z-post-v4-customer-refresh-*` |
| 移行後backup暗号化         | DB・storageとも成功                                                                   |
| 移行後DB隔離復元・全件突合 | `FULL_DATABASE_RECONCILIATION_OK`                                                     |
| 移行後storage隔離復元      | 画像112件とtarget markerを復元し、live storageと一致                                  |
| application health         | healthy                                                                               |
| 旧本番                     | 停止・書込み・routing変更なし                                                         |

更新前storageの113 filesは、公開画像112件とpreview target marker 1件です。

## V4取込後の検証済み件数

次はlive previewと、移行後backupを隔離復元したDBの両方で一致した件数です。

| モデル                 | 検証件数 |
| ---------------------- | -------: |
| `Store`                |        1 |
| `Admin`                |        2 |
| `Customer`             |   13,227 |
| `CoursePrice`          |       13 |
| `OptionPrice`          |       11 |
| `Cast`                 |       38 |
| `CastOptionSetting`    |      280 |
| `CastSchedule`         |      210 |
| `Reservation`          |    1,049 |
| `ReservationOption`    |    1,858 |
| `Review`               |      259 |
| `CustomerPointHistory` |        0 |
| `NgCastEntry`          |        0 |
| `ReservationHistory`   |        0 |
| キャスト公開画像       |      112 |

`Customer=13,227` は、旧会員行13,226件と、予約・口コミから参照された会員台帳欠落IDの確認用補完1件です。QA顧客は旧会員行のうち1件を確認用ログインへ割り当て、紐付く完了予約10件の履歴表示をbrowserで確認済みです。この「予約10件」は `ReservationHistory` の変更履歴ではありません。

## 顧客aggregate検証値

### account status

| `accountStatus` | 検証件数 |
| --------------- | -------: |
| `active`        |   13,184 |
| `blocked`       |       28 |
| `pending`       |        4 |
| `withdrawn`     |       10 |
| `unknown`       |        1 |

### membership stage

| `membershipStage` | 検証件数 |
| ----------------- | -------: |
| `regular`         |   13,216 |
| `silver`          |        8 |
| `gold`            |        2 |
| `platinum`        |        1 |

### member type

| `memberType` | 検証件数 |
| ------------ | -------: |
| `vip`        |   11,814 |
| `regular`    |    1,413 |

### security aggregate

- 全13,227件の電話番号とメール文字列が、それぞれ重複しないことを確認した。
- 顧客のSMS・メール通知が全件無効であることを確認した。
- QA顧客1件だけが確認用ログイン可能・メール確認済みであることを確認した。
- QA以外の顧客13,226件がログイン不能な無効credentialであることを確認した。
- 旧passwordが取得・投入・出力されていないことを確認した。
- 管理者、QA顧客、QAキャストのcredentialはprivateファイルだけで管理する。
- 顧客データ・認証情報を公開HPや公開画像経路へ出さない。

メール文字列の小文字化と重複排除は行いますが、旧メールには形式不正・欠損が多数あります。V4 previewのメールを、通知先・本人確認済みID・本番ログインIDとして承認してはいけません。

## データ補完と対象外

| 項目             | V4での扱い                                                                |
| ---------------- | ------------------------------------------------------------------------- |
| 予約履歴         | 2026-04-21以降の約3か月分だけ。全期間ではない                             |
| ポイント         | 現在残高を保持するが、増減履歴は0件                                       |
| NG               | NG設定・NG履歴は0件                                                       |
| 予約変更履歴     | `ReservationHistory=0`。旧変更履歴は未移行                                |
| 生年月日         | 旧値を使えない4件は年齢または固定日から確認用に合成                       |
| 登録日時         | 旧登録日時を使えない71件はV4 cutoffを使用                                 |
| 電話番号         | 旧値を使えない12件は重複しない確認用番号へ補完                            |
| メール           | 形式不正・欠損が多数。欠損・重複時は確認環境専用の無効アドレスへ補完      |
| `nameKana`       | フリガナ専用の旧値がないため、多くの顧客で氏名をそのままコピー            |
| 非公開画像       | 対象外                                                                    |
| チャット・精算等 | 対象外。新モデルへ移行するか参照archiveへ置くか、最終切替前に別途承認する |

補完値は画面を動かすためのpreview値であり、旧データとの完全一致や本番採用を意味しません。

## リモートV4実施チェック

### 更新前backup

- [x] 現行preview DBを暗号化backupした。
- [x] 現行preview storageを暗号化backupした。
- [x] DB backupを隔離PostgreSQLへ完全復元し、`Customer=1,007`、`Reservation=1,047` を含む更新前DB件数と一致した。
- [x] storage backupを隔離展開し、113 files、10,404,226 byte、SHA-256が一致した。

### 空環境への取込

- [x] preview applicationを停止し、対象がpreview専用DB・volumeであることを再確認した。
- [x] preview DBを空から再作成し、`salon.environment=staging-preview` とtarget markerを照合した。
- [x] preview storageをmarker以外が空の状態から再作成した。
- [x] Prisma migration 13件を適用した。
- [x] V4 snapshot SHA-256と画像manifest SHA-256が上記承認値と一致した。
- [x] データ取込と画像112件の検証付きcopyが成功した。

### 全件突合

- [x] `FULL_DATABASE_RECONCILIATION_OK` で上表の全model件数が検証値と一致した。
- [x] status・stage・member typeのaggregateが検証値と一致した。
- [x] QA顧客に予約10件が紐付き、QA以外の顧客がログイン不能である。
- [x] 電話・メール文字列の重複、未解決参照、店舗越境、孤立行が0件だった。
- [x] 画像manifest 112件とstorage 112件が1対1で一致した。
- [x] 画像112件すべてのbyte数とSHA-256が一致した。
- [x] Castの画像URLが `/salon-uploads/casts/ikebukuro/...` を参照した。
- [x] 外部通知と決済が停止し、旧passwordが存在しないことを確認した。

### 移行後backup

- [x] V4取込後のDB・storageを暗号化backupした。
- [x] 移行後backupを隔離環境へ完全復元した。
- [x] 復元DBで `FULL_DATABASE_RECONCILIATION_OK` が再現し、復元画像112件のSHA-256がlive previewに一致した。
- [x] applicationがhealthyであることを確認した。

## V5最終ブラウザ確認（全項目再実施）

実施者: `　　　　　　　　　　　　　　`

実施日時: `　　　　年　　　月　　　日　　　時　　　分`

### 公開HP

- [ ] <https://salon.c-platinum.com/ikebukuro> がエラーなく開く。
- [ ] <https://salon.c-platinum.com/ikebukuro/cast> でキャスト一覧と画像が表示される。
- [ ] <https://salon.c-platinum.com/ikebukuro/cast/legacy-cast-56060> が表示される。
- [ ] <https://salon.c-platinum.com/ikebukuro/cast/legacy-cast-56229> が表示される。
- [ ] 画像の404、別キャスト画像の混入、不自然な欠落がない。
- [ ] 出勤、料金、ネット予約の代表導線が開く。

### 管理画面

- [ ] <https://salon.c-platinum.com/admin/login> で確認用管理者がログインできる。
- [ ] <https://salon.c-platinum.com/admin/customers> がエラーなく開く。
- [ ] 会員ID `100448` を検索し、該当顧客の詳細を開ける。
- [ ] 確認用ログインへ割り当てたQA顧客の詳細に完了予約15件が表示される。
- [ ] <https://salon.c-platinum.com/admin/reservation-list> で予約一覧と詳細が表示される。
- [ ] <https://salon.c-platinum.com/admin/reservation> で顧客名を含むtimelineが表示される。
- [ ] <https://salon.c-platinum.com/admin/reservation?customerId=legacy-customer-member-100448> で選択顧客名が保持される。
- [ ] <https://salon.c-platinum.com/admin/cast/manage/legacy-cast-56060> がエラーなく開く。
- [ ] 顧客、出勤、コース、オプション、エリア、駅、ホテルの代表画面が開く。
- [ ] 不要な上部検索が表示されず、`/admin/search` を通常導線として使わない。

### 顧客・キャスト

- [ ] 確認用QA顧客でログインでき、完了予約15件の履歴表示を確認できる。
- [ ] 確認用QAキャストでログインでき、自分の画面だけが見える。
- [ ] 各roleが権限外の顧客、キャスト、店舗情報を閲覧できない。

### 安全確認

- [ ] 書込み確認が必要な場合は `[UAT]` 専用データだけを使った。
- [ ] LINE、メール、SMS、Push、決済の実送信・実課金が発生していない。
- [ ] エラー証跡にcredential、氏名、電話、メールを記録していない。

## 現場確認と判定

- [x] 技術担当がリモートbackup、V5取込、全件突合、移行後backup復元を完了した。
- [x] 技術担当が管理画面の顧客一覧・検索・詳細・予約履歴・顧客指定timelineを確認した。
- [x] 技術担当が公開HPの年齢確認と確認用QA顧客ログインを完了した。
- [ ] 確認用QAキャストログインを最終releaseで再確認する。
- [ ] 現場担当者が[池袋・新システム 現場確認マニュアル](./IKEBUKURO_FIELD_UAT_MANUAL.md)を完了した。

- `合格`: 全チェックが完了し、対象範囲に説明できない差分がない。
- `条件付き`: 明示した補完・対象外だけが残り、範囲と対応期限を責任者が承認した。
- `不合格`: 件数、予約、出勤、認証、画像、権限、通知・決済安全性に説明できない差分がある。

現在の判定: **V5の確認環境取込、全件突合、画像照合、backup隔離復元、主要画面・QA顧客ログインの技術確認まで完了。現場確認は開始可能。QAキャストログインの最終release再確認と現場担当者の業務・視認性確認はPending。本番切替はNo-Go。**

本番切替時は旧システムをメンテナンス表示にして書込みを停止し、最新DB snapshotと画像差分を再取得します。同じ検証付き取込、全件突合、ブラウザsmoke、ロールバック判定を再実施し、すべて合格するまでroutingを切り替えません。

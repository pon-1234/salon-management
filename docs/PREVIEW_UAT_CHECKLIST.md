# 現場確認環境（UAT）チェックリスト

このチェックリストは、旧本番を稼働させたまま取得した一時snapshotを、隔離された新システムへ投入して現場確認するためのものです。確認DBは破棄前提であり、そのまま新本番へ昇格させません。最終切替では旧側の書込みを停止し、新しいsnapshotから同じ版の変換・投入をやり直します。

## 2026-07-21 池袋V3 snapshot取得・preview技術確認結果

池袋の現場画面確認用として、旧本番DB `nzuadtjn_gold_master` の `shop_no=5600` を読み取り専用transactionで取得し、直接の顧客PIIを含まないV3 snapshotをローカルで厳格変換しました。artifactはGit管理対象外の `migration-data/ikebukuro-preview-v3-20260721.json` です。取得処理によって旧本番の稼働・データ・routingは変更していません。

今回の取得は、旧本番の通常書込みを止めていない **best-effortかつ最終切替用ではないextract** です。基準日時は今回の取得範囲のcutoffを示しますが、共有会員DBや画像を含む全移行対象の同一cutoffは証明しません。V3 snapshotは空から再作成した隔離preview DBへ投入し、技術担当によるbrowser smokeまで完了しました。確認対象の公開入口は `https://salon.c-platinum.com/ikebukuro`、管理入口は `https://salon.c-platinum.com/admin/login` です。

| 項目                         | 2026-07-21取得・確認結果                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| データ基準日時               | `2026-07-21T12:07:35+09:00`                                                           |
| best-effort snapshot SHA-256 | `e2b19b1d287094c0066e740c4812ab4fde6a3ba4161991395a38f5194ccba479`                    |
| 取得元                       | `nzuadtjn_gold_master`, `shop_no=5600`                                                |
| 出勤対象期間                 | 2026-07-21〜2026-08-18                                                                |
| 予約対象期間                 | 2026-04-21以降                                                                        |
| 顧客情報                     | 旧顧客の氏名・電話・メール等の直接PIIはsnapshot対象外。画面では匿名化した識別名を表示 |
| 画像                         | 画像byteはsnapshot対象外であり、preview storageへの検証付きcopyは未完了               |
| 厳格変換                     | 成功                                                                                  |
| preview DB投入               | 成功。専用volumeを空から再作成し、件数・参照整合性を再照合                            |
| ブラウザ確認                 | 成功。公開画面、管理画面、予約、顧客timeline、各設定画面の代表導線を確認              |
| CI                           | 成功。lint、format、型検査、単体・統合テスト、coverage、build、Playwrightを含む       |
| 判定                         | 明日の池袋現場UI確認はReady。本番切替と正式な最終移行UATは未承認・No-Go               |

### preview配置証跡

| 項目                    | 結果                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| 配置日                  | 2026-07-21                                                                |
| 配置source tree SHA-256 | `cf245f58a8891d6895b45a9b2e90aa078f262a3c607f219db25873451f8c4f97`        |
| Docker image digest     | `sha256:e90b744c6f746a30d4dc81a9ce85877077b42cb8e443ccce6a10a8544f490563` |
| preview DB              | `salon_uat_preview`、`salon.environment=staging-preview`                  |
| HTTP Basic Auth         | 2026-07-21に解除。公開HPは直接閲覧可、管理画面はapplicationログインを維持 |
| rollback backup         | preview初期化前の暗号化DB backupを保持                                    |
| 旧本番                  | application・DB container ID不変、書込み・routing変更なし                 |
| 一時取込ファイル        | 投入・再照合後にpreview serverとapplication containerから削除済み         |

### 取得元行数

| 対象               | 行数 |
| ------------------ | ---: |
| 店舗               |    1 |
| コース             |   13 |
| 有料オプション     |    7 |
| 無料オプション     |    4 |
| エリア             |    1 |
| 駅                 |    7 |
| ホテル表示グループ |    1 |
| ホテル             |    2 |
| キャスト           |   38 |
| 出勤               |  129 |
| 予約               |  959 |
| 口コミ             |  258 |

### 変換後件数

| 対象                      | 件数 |
| ------------------------- | ---: |
| オプションマスタ          |   11 |
| キャスト別オプション設定  |  280 |
| エリア                    |    1 |
| 駅                        |    7 |
| ホテル                    |    2 |
| ホテル対応エリア          |    0 |
| ホテル料金                |    0 |
| キャスト                  |   38 |
| 出勤                      |  129 |
| 予約                      |  959 |
| 予約オプション            | 1706 |
| 口コミ                    |  258 |
| エリア参照付き予約        |  959 |
| 駅参照付き予約            |  959 |
| ホテル参照付き予約        |    0 |
| `hotelExpense` がある予約 |    0 |
| `hotelExpense` 合計       |    0 |

ホテル2件は正規化したホテルマスタへ変換済みです。旧 `hotel_area` はホテルの表示グループとして `HotelSettings.area` に保持し、施術対応エリアには使いません。今回の2件は `city_no` / `city_no2` がすべて0、`price1`〜`price4` が空であるため、ホテル対応エリアとホテル料金が0件なのは意図した結果です。旧予約にもホテル参照はありませんでした。

### 最終preview DB件数

| モデル              | 件数 |
| ------------------- | ---: |
| `Store`             |    1 |
| `StoreSettings`     |    1 |
| `Admin`             |    2 |
| `Customer`          |  953 |
| `CoursePrice`       |   13 |
| `OptionPrice`       |   11 |
| `CastOptionSetting` |  280 |
| `AreaInfo`          |    1 |
| `StationInfo`       |    7 |
| `HotelSettings`     |    2 |
| `HotelServiceArea`  |    0 |
| `HotelRate`         |    0 |
| `Cast`              |   38 |
| `CastSchedule`      |  129 |
| `Reservation`       |  959 |
| `ReservationOption` | 1706 |
| `Review`            |  258 |

`Customer` 953件は旧予約参照キーから作成した匿名化顧客952件と操作確認用顧客1件で、旧顧客PIIを移行した件数ではありません。`Admin` 2件もpreview専用の確認用accountです。

予約からキャスト・コース・エリア・駅への店舗越境、予約オプション、キャスト別オプション、駅からエリアへの不整合はすべて0件でした。959予約すべてにエリア・駅参照があり、エリアと駅の組合せ不一致も0件です。ホテル参照と `hotelExpense` は今回のsnapshotでは0件で、旧値と一致します。

最終切替前には、旧側のcoordinated write pause、必要に応じたincremental extractまたは書込み停止後の再extract、共有会員DBを含むlocked final extract、同一cutoffの完全な自動突合、PIIの承認済み移行、画像byteの検証付きcopyが必要です。V3 snapshotの変換成功だけを、preview投入完了、現場承認、画像移行完了、本番切替可能の証拠として扱ってはいけません。

## 合成データだけの事前機能確認（上記実データpreviewとは別）

旧データsnapshotの準備前に画面・認証・権限制御を確認する場合は、移行previewとは別の破棄可能DBで `pnpm setup:preview-uat` を使用できます。このコマンドは旧本番・旧DB・旧serverへ接続しません。`DATABASE_URL` で明示されたPostgreSQLだけを使用し、旧repositoryも読みません。合成データの確認成功を、旧データcopy、移行UAT、本番切替の承認として扱ってはいけません。

対象DBはPrisma migration適用後、`_prisma_migrations` 以外の全application tableが完全に空でなければなりません。実snapshotを投入したDB、過去の合成データが残るDB、demo seed済みDBでは実行しません。コマンドは再実行を拒否するため、やり直し時はDBを破棄して空から作成します。

環境担当者が次を先に用意します。

- DB名が `_preview` で終わる専用DB。
- DB側の `salon.environment=staging-preview` と、環境変数 `PREVIEW_TARGET_ID` に完全一致するDB側 `salon.target_id`。
- `APP_RUNTIME_MODE=preview` と `OUTBOUND_DELIVERY_MODE=disabled`。provider credentialは設定しない。
- secret managerから読み込んだ、互いに異なる管理者・顧客・キャスト用password。値を引数、shell history、log、チェックリストへ記録しない。

```bash
export APP_RUNTIME_MODE=preview
export OUTBOUND_DELIVERY_MODE=disabled
: "${DATABASE_URL:?load the isolated *_preview DATABASE_URL from the secret manager}"
: "${PREVIEW_TARGET_ID:?load the independently provisioned preview target marker}"

read -r -s PREVIEW_UAT_ADMIN_PASSWORD && export PREVIEW_UAT_ADMIN_PASSWORD
read -r -s PREVIEW_UAT_CUSTOMER_PASSWORD && export PREVIEW_UAT_CUSTOMER_PASSWORD
read -r -s PREVIEW_UAT_CAST_PASSWORD && export PREVIEW_UAT_CAST_PASSWORD

pnpm setup:preview-uat -- \
  --ack CREATE_SYNTHETIC_UAT_DATA_IN_EMPTY_ISOLATED_PREVIEW

unset PREVIEW_UAT_ADMIN_PASSWORD PREVIEW_UAT_CUSTOMER_PASSWORD PREVIEW_UAT_CAST_PASSWORD
```

作成されるaccountは `super-admin@preview-uat.invalid`、池袋店限定 `manager-ikebukuro@preview-uat.invalid`、`customer@preview-uat.invalid`、`cast-ikebukuro@preview-uat.invalid`、`cast-osaka@preview-uat.invalid` です。表示名・店舗・予約・口コミ等には `[UAT]` が付き、池袋・大阪の2店舗、料金・option・指名料、出勤、過去／未来予約、point履歴を含みます。池袋店の内部IDは `uat-ikebukuro` のまま、公開slugは `ikebukuro` とし、確認用HPと配下のログイン・予約・キャスト導線を `/ikebukuro` に統一します。preview環境に限り、旧 `/uat-ikebukuro` 配下は認証gate通過後に同じ `/ikebukuro` 配下へredirectします。`.invalid` addressと通知無効設定だけを使用し、メール、SMS、Push、LINE、決済providerへ送信しません。password値は成功・失敗logへ出力されません。

## 確認記録

次の空欄は、現場確認者の記録と、最終的なlocked extractを使用する移行UATで記入します。上記best-effort extractのSHA-256を、未作成のmanifestやcanonical digestへ転記してはいけません。

| 項目                                  | 記入欄                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 確認環境URL                           | 公開 `https://salon.c-platinum.com/ikebukuro`、管理 `https://salon.c-platinum.com/admin/login` |
| snapshot ID                           | `ikebukuro-preview-v3-20260721`                                                                |
| データ基準日時（cutoff）              | `2026-07-21T12:07:35+09:00`                                                                    |
| best-effort snapshot SHA-256          | `e2b19b1d287094c0066e740c4812ab4fde6a3ba4161991395a38f5194ccba479`                             |
| snapshot manifest SHA-256             | 今回の限定previewでは未作成                                                                    |
| migration manifest SHA-256            | 今回の限定previewでは未作成                                                                    |
| canonical export SHA-256              | 今回の限定previewでは未作成                                                                    |
| prepared canonical digest             | 今回の限定previewでは未作成                                                                    |
| 画像manifest SHA-256                  | 未作成。画像byteは今回のsnapshot対象外                                                         |
| extractor／変換policy版               | 池袋V3限定extractor／変換policy                                                                |
| importerのGit revision                | 未確定。配置source tree SHA-256はpreview配置証跡に記録                                         |
| snapshot検証／DB投入／画像copy report | snapshot検証・DB投入・件数／参照突合・browser smoke成功。画像byte copyは対象外                 |
| 確認店舗                              | 池袋                                                                                           |
| 技術確認                              | 2026-07-21完了                                                                                 |
| 現場確認者・確認日時                  | 未実施                                                                                         |

氏名、電話番号、メールアドレス、画像、予約内容などの個人情報を、チケット、チャット、画面録画、公開共有先へ貼り付けません。不具合証跡にはpreview内の対象ID、画面名、時刻、期待結果と実結果だけを記録します。

## 開始前の必須確認

限定previewとしてのDB投入、件数・参照突合、代表browser導線の技術確認は完了しています。一方、共有会員DBとのcutoff統一、PII、画像byte、locked final extract、現場承認は未完了です。したがって、明日の確認はUI・権限・導線と匿名化データの業務表示確認として開始できますが、正式な最終移行UATと本番切替の開始条件はまだ満たしていません。

- 固定の確認環境バナーが画面を覆っていない。確認環境はpreview専用URL・DB・account、外部送信停止、crawler拒否で識別し、snapshot基準日時と未承認状態は投入report・現場承認記録で確認する。合成データは `[UAT]`、池袋V3の匿名化顧客は `[確認用]` で識別する。
- 池袋V3確認環境はHTTP Basic Authを使用せず、公開HPは認証なし、管理画面はapplicationログインで保護する。旧顧客PII、非公開画像、実credentialを配置しない。これらを扱う正式移行UATではidentity-aware proxyまたはVPNを追加する。
- メール、SMS、Push、LINE、オンライン決済は停止している。実在する顧客・キャストへ試験送信しない。
- URL、DB、storage、NextAuth secret、管理者アカウントが旧本番・新本番と別である。
- 自動突合が合格し、投入件数、拒否件数、未解決参照、checksum差分が確認済みである。
- policyの必須tableとusageがsnapshot inventoryに完全一致し、中央DB・店舗DBを含む全originの同一cutoff証跡が承認されている。単一originの部分previewを全件確認として扱わない。
- [旧データextractor完全性契約](./LEGACY_EXTRACTOR_CONTRACT.md)の独立verifierがraw行・disposition・canonical行の完全な集合一致を証明し、`unsupported-blocking = 0` である。
- DB投入reportがcommit済みを示す。disconnect warningが出た場合は、同じ入力の再実行が完全reuseで成功した証跡がある。
- 画像copyとDB投入のどちらかが一度でも失敗した場合は、そのDB・volumeを破棄して空から再作成している。
- preview storageにはtarget markerと今回の画像計画に含まれるfile以外がなく、過去のpreview・demo・非公開fileが残っていない。
- 旧本番からpreviewへは一方向snapshotだけであり、previewから旧本番へ書き戻す処理がない。

一つでも確認できない場合は、正式な移行UATとして承認せず環境担当へ戻します。今回のような限定的なUI smokeを続ける場合は、未達項目と確認範囲を記録し、本番切替判断から明確に除外します。

## 2026-07-21 実ブラウザ技術UAT結果

| 対象     | 確認内容                                                                                                  | 結果 |
| -------- | --------------------------------------------------------------------------------------------------------- | ---- |
| 公開画面 | 池袋トップ、キャスト一覧・詳細、出勤、料金、予約導線                                                      | 合格 |
| 管理画面 | ログイン、dashboard、キャスト詳細、予約一覧、顧客timeline                                                 | 合格 |
| 設定画面 | オプション11件（有効9・無効2）、エリア1件、駅7件、ホテル2件を表示                                         | 合格 |
| 顧客表示 | 匿名化した顧客識別名が予約timelineに表示され、空欄・「名前未設定」にならない                              | 合格 |
| 予約操作 | 代表予約を確認済みから修正可能へ変更し、確認済みへ復元                                                    | 合格 |
| 設定操作 | オプション追加・編集・削除、エリア／駅の停止・再有効化、ホテル追加・非表示                                | 合格 |
| 後処理   | 書込みsmoke後にpreview DBを空から再作成してV3を再投入し、`[UAT]` 操作確認データが残っていないことを再確認 | 合格 |
| 対象範囲 | 依頼対象の代表導線smoke。全ボタン、全role、全業務ケースの現場確認ではない                                 | 限定 |

## 旧データの画面照合

各店舗で最低限、未来予約、完了予約、キャンセル予約、ポイント保有顧客、複数年履歴、出勤予定あり／なし、画像あり／なしを含む標本を選びます。旧画面と新画面を同じ基準日時で比較します。

| 対象     | 確認内容                                                             | 結果   |
| -------- | -------------------------------------------------------------------- | ------ |
| 店舗     | 店舗名、電話、住所、公開状態、対象店舗の切替                         | 未確認 |
| コース   | 名称、時間、料金、店舗／キャスト配分、公開・Web予約可否              | 未確認 |
| キャスト | 所属、表示名、身体情報、在籍状態、画像、予約可否                     | 未確認 |
| 顧客     | 氏名、電話、メール、生年月日、通知設定、ポイント残高                 | 未確認 |
| 予約     | 店舗、顧客、キャスト、コース、開始・終了、状態、料金、ポイント利用   | 未確認 |
| 出勤     | 日付、開始・終了、受付可否、日跨ぎ                                   | 未確認 |
| ポイント | 非負残高、履歴順、増減符号、予約利用額との完全一致、持越し、最新残高 | 未確認 |
| 画像     | 表示件数、404なし、別キャスト画像の混入なし、非公開画像の露出なし    | 要対応 |

`29:00` など翌日扱いの時刻、複数コース予約、年次テーブルをまたぐ履歴、重複会員、削除済み予約は重点確認対象です。値を推測で合わせず、変換規則が未承認なら不合格として記録します。

## 操作確認

書込み操作は、名前やメモの先頭に `[UAT]` を付けた専用確認データで行います。投入済み旧データを編集する試験が必要な場合は、対象IDと変更内容を記録し、その後の自動再照合が差分を検出することも確認します。

- 管理者: 店舗切替、権限制御、顧客検索、予約作成・変更・キャンセル、出勤変更、料金設定の表示。
- キャスト: 専用QAキャストでログインし、自分の予約・出勤だけが見えること。他キャストや他店舗を見られないこと。
- 顧客: 専用QA顧客で登録・ログイン・マイページ・予約を確認する。移行顧客の旧パスワードは使用しない。
- 競合: 同じキャスト・時刻への二重予約、重複メール・電話、同日出勤の重複が拒否される。
- 障害表示: 通知停止やオンライン決済未設定が、実送信・実課金成功として表示されない。
- セキュリティ: URLやAPIへ別店舗ID・別顧客IDを指定しても、権限外データを取得・更新できない。

## 現版で確認対象外のデータ

今回のV3 snapshotでは、有料7件・無料4件をオプションマスタ11件へ正規化し、キャスト別オプション設定280件、予約オプション1706件、口コミ258件まで厳格変換しています。ただし、この結果は今回取得したdataset内の変換成功であり、共有会員DB・画像・全履歴を含む移行全体の完全性証明ではありません。NG設定、予約変更履歴、チャット、精算、削除予約の完全履歴、非公開画像、顧客PIIは引き続き対象外または未完了です。これらが未対応の環境を「全機能確認済み」または「本番移行可能」と承認してはいけません。各項目は、新モデルへ移行するか参照専用アーカイブへ置くかを業務責任者が決めます。

## 判定

- `合格`: 自動照合が全項目一致し、対象機能の代表ケースと権限制御を複数名で確認した。
- `条件付き`: 現版の明示的な対象外だけが残り、対象範囲と期限を責任者が承認した。
- `不合格`: 件数、金額、ポイント、未来予約、時刻、店舗境界、認証、画像、通知／決済安全性のいずれかに説明できない差分がある。

UAT合格は、現在のsnapshotとコード版に対する評価です。本番切替の承認ではありません。最終切替時は、書込み停止後の最新snapshot、全checksum、全自動照合、スモークテスト、ロールバック判断を改めて実施します。

現在の判定は、**技術previewは明日の池袋現場確認を開始可能、現場UATは承認待ち、最終本番切替はNo-Go** です。

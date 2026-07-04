# legacy gold-esthe.com 管理画面 移行棚卸し

作成日: 2026-05-29

## 対象

- 旧管理画面: `/Users/pon/dev/gambit-front/public_html/manage-gb.com/gold-esthe.com/admin`
- 新システム: `/Users/pon/dev/salon-management`
- 旧メニュー定義: `side_menu.php`
- 旧PHPファイル数: 管理画面直下 171 ファイル
- 新管理画面: `/admin/*`
- 新API: `/api/*`
- 新DB定義: `prisma/schema.prisma`

## 判定凡例

| 判定                  | 意味                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| 移行候補あり          | 新側に近い画面/API/DBモデルがある。旧仕様との差分検証とデータ移行が必要。      |
| 一部実装              | 新側に機能はあるが、旧画面の業務ルール・検索条件・帳票・集計粒度までは未確認。 |
| UIのみ                | 画面はあるが、保存API/DB接続/実データ反映が未完成。                            |
| 未実装                | 新側に明確な対応先が見当たらない。                                             |
| 外部連携確認          | CTI、SMS、メール、LINE、決済、cronなど外部サービスの本番接続確認が必要。       |
| 共通/置換             | レイアウト、共通部品、旧AJAXなど。Next.js側の共通構造へ置換対象。              |
| 保留/旧コメントアウト | 旧メニューでもコメントアウト、または現行運用要否の確認が必要。                 |
| 要仕様確認            | ファイル名から用途は推測できるが、運用有無・旧仕様・新側対応方針の確認が必要。 |

## 全体ブロッカー

| 項目            | 現状                                                                                                     | 本番前に必要なこと                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| DB接続          | Prismaの実DB接続が失敗する状態。                                                                         | Supabase/PostgreSQL接続情報を修正し、`prisma migrate status` と基本CRUDを通す。            |
| DBスキーマ/seed | `Store` 前提のschemaに対し、seed側で `storeId` が不足している箇所がある。                                | 実店舗ID、旧 `shop_rid`、旧 `shop_no` の対応を決め、seedと初期データを修正する。           |
| ブランド/店舗   | 新側の店舗定義は `ikebukuro/shinjuku/shibuya` の汎用データ。                                             | `gold-esthe.com`, `bollinger-m.com`, `prime-gb.com` の実店舗データへ置換する。             |
| 品質ゲート      | buildは通るが、TypeScript/ESLintをbuild時に無視している。typecheck/lint/testは失敗。                     | `typecheck`, `lint`, `test` を本番ゲートに戻して全て通す。                                 |
| データ移行      | 旧MySQLから新PostgreSQLへの移行ETLが見当たらない。                                                       | 顧客、女性、予約、出勤、日報、入金、ポイント、口コミ、日記、画像、設定マスタの移行を作る。 |
| 画像移行        | 新側はSupabase Storage前提。旧 `img_girls`, `img_member`, `img_voice`, `img_column` 等の移行設計が不足。 | 旧画像パスから新storage URLへの変換表とDB更新処理を作る。                                  |
| 外部サービス    | メール/SMS/Pushにmockや未設定時fallbackが残る。                                                          | Resend/Vonage/LINE/CTI/決済/cronの本番接続を個別に検証する。                               |
| 権限            | 新schemaは `Admin.permissions Json?`。一部コードは文字列JSONとして扱う。                                 | 権限JSONの保存形式を統一し、super admin/staffの移行ルールを定義する。                      |

## 旧メニュー別棚卸し

| 旧カテゴリ         | 旧メニュー/機能              | 主な旧PHP                                                            | 新側候補                                                                   | 判定                  | 残タスク                                                                         |
| ------------------ | ---------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| 新着情報           | 予約未処理                   | `order_select.php`, `ajax_admin_menu.php`                            | `/admin/reservation-list`, `/admin/reservation`, `/api/reservation`        | 一部実装              | 旧 `show_flg=web` の未処理条件、30秒カウント更新、予約ステータス対応を移行。     |
| 新着情報           | 業務連絡                     | `admin_mail_list.php`, `admin_mail.php`, `admin_mail_all.php`        | `/admin/chat`, `/api/chat/*`                                               | 一部実装              | 旧業務連絡と新チャットの対象者、既読、通知、履歴保存の差分確認。                 |
| 新着情報           | クチコミ承認                 | `member_voice.php`, `member_voice_add.php`, `member_voice_staff.php` | `/admin/reviews`, `/api/review`                                            | 移行候補あり          | 旧口コミの承認状態、スタッフ返信、画像/評価項目を新 `Review` に移行。            |
| 新着情報           | 着信履歴                     | 外部CTIリンク, `receive_tel.php`                                     | `components/cti/*`                                                         | 外部連携確認          | InfiniTalk/CTI履歴を新側で読むのか、ポップアップのみで足りるのか決定。           |
| 新着情報           | 管理人メッセ                 | `girls_add.php#page8`                                                | `/admin/chat` 付近                                                         | 未実装                | 旧「管理人メッセ」の送受信対象と保存先を確認し、新チャットまたは専用機能へ移行。 |
| 新着情報           | 業務Q&A                      | `qa_staff.php`                                                       | 設定トップに項目のみ                                                       | 未実装                | 新側は `business-qa` が準備中。閲覧/回答/管理画面を実装。                        |
| オーダー状況       | 本日の予約                   | `order_select.php`                                                   | `/admin/reservation-list`, `/api/reservation`                              | 一部実装              | 旧5:30日付切替、当日抽出、予約状態、担当者表示を検証。                           |
| オーダー状況       | 予約オーダー                 | `order_select.php`, `order.php`, `order_set*.php`                    | `/admin/reservation`, `/api/reservation`                                   | 一部実装              | 予約作成/変更/削除、LINE通知、履歴、ホテル/駅AJAXを旧仕様と突合。                |
| オーダー状況       | 日報表示                     | `data_day.php`                                                       | `/admin/analytics/daily-report`, `/api/analytics/daily-report`             | 一部実装              | 旧 `nippo` の集計項目、5:30切替、更新時刻表示を移行。                            |
| オーダー状況       | ユーザー一覧                 | `member_list.php`, `member_data.php`                                 | `/admin/customers`, `/api/admin/customers`, `/api/customer`                | 一部実装              | 旧会員ランク、NG、電話検索、ポイント、秘密情報を新 `Customer` に移行。           |
| オーダー状況       | 在籍女性一覧                 | `girls_list.php`, `girls_add.php`, `girls_regist.php`                | `/admin/cast/list`, `/admin/cast/manage/[id]`, `/api/cast`                 | 一部実装              | 旧女性プロフィール、画像、媒体、NG、本人確認、推薦、送信設定を移行。             |
| 女性出勤＆入金管理 | 出勤一覧(詳細)               | `girls_schedule_list_all*.php`                                       | `/admin/cast/weekly-schedule`, `/api/cast-schedule`                        | 一部実装              | 旧詳細表示、予約重ね合わせ、現在出勤AJAX、日別編集を検証。                       |
| 女性出勤＆入金管理 | 週間予定表示                 | `girls_schedule_list_week*.php`                                      | `/admin/cast/weekly-schedule`                                              | 一部実装              | 週表示、追加画面、印刷/公開反映を検証。                                          |
| 女性出勤＆入金管理 | 女性入金(月別)               | `girls_charge_list.php`, `girls_charge_add.php`                      | `/api/admin/cast/settlements`, cast portal settlements                     | 一部実装              | 管理画面側の月別入金UI、支払済管理、印刷、旧年別テーブル移行が必要。             |
| 女性出勤＆入金管理 | 入金種別管理                 | `girls_charge_admin.php`                                             | `SettlementPayment` 周辺                                                   | 未実装                | 旧入金種別/控除/保証/バック率のマスタ化が必要。                                  |
| 女性出勤＆入金管理 | 女性就業管理                 | `data_girls_data.php`                                                | `/admin/analytics/cast-performance`, `/admin/analytics/staff-attendance`   | 一部実装              | 旧月次就業指標、給与/入金との対応、帳票出力を検証。                              |
| コンテンツ管理     | 写メ日記管理                 | `news_feed_list.php`, `news_feed_cm*.php`                            | cast portal `/cast/diary` のみ                                             | 未実装                | 管理画面側の一覧、承認、コメント、旧画像移行が必要。                             |
| コンテンツ管理     | コメント管理                 | `news_feed_cm_all.php`, `news_feed_cm.php`                           | なし                                                                       | 未実装                | 日記コメント管理のDBモデル/API/管理画面が必要。                                  |
| コンテンツ管理     | コラム管理                   | `column.php`                                                         | なし                                                                       | 未実装                | 旧コラムの公開/編集/画像/SEOを移行するか要判断。                                 |
| コンテンツ管理     | メッセージ管理               | `bbs_cm_all.php`, `bbs_cm.php`, `bbs_list*.php`                      | `/admin/chat`, `/api/chat/*`                                               | 一部実装              | 旧BBS/メッセージのスレッド構造、未読、添付、対象者を新 `Message` に移行。        |
| その他管理         | 店舗情報                     | `info_shop.php`, `shop_info.php`                                     | `/admin/settings/store-info`, `/api/settings/store`                        | 一部実装              | 旧店舗定数、営業時間、電話、住所、求人/地図/StreetViewを統合。                   |
| その他管理         | 業務Q&A管理                  | `info_qa_staff.php`                                                  | 設定トップに項目のみ                                                       | 未実装                | スタッフ向けQ&A管理画面/API/DBが必要。                                           |
| その他管理         | よくある質問                 | `info_qa.php`                                                        | 設定トップに項目のみ                                                       | 未実装                | 新設定ではavailable表示だが遷移先なし。FAQ DB/API/画面が必要。                   |
| その他管理         | イベント(PC)                 | `info_campaign_all_pc.php`                                           | `/admin/settings/event-banners`, `/api/settings/event-banners`             | 移行候補あり          | 旧イベント本文/画像/表示条件と新バナー仕様の差分確認。                           |
| その他管理         | エリア情報                   | `info_area.php`, `ajax_city*.php`                                    | `/admin/settings/area-info`, `/api/settings/area`                          | 移行候補あり          | 旧都道府県範囲、city/station連動、交通費/表示順を移行。                          |
| その他管理         | 駅情報                       | `info_station.php`, `info_station_kana.php`, `ajax_station.php`      | `/admin/settings/station-info`, `/api/settings/station`                    | 移行候補あり          | 旧かな検索、駅別料金、表示制御を移行。                                           |
| その他管理         | 媒体情報                     | `info_media.php`                                                     | `/admin/analytics/marketing-channels`                                      | 未実装                | 設定トップではavailableだが専用設定画面なし。媒体マスタ管理が必要。              |
| その他管理         | 管理者情報                   | `info_person.php`, `info_person_contents.php`                        | `/admin/settings/admin-info`, `/api/admin`                                 | 一部実装              | 旧管理者権限/パスワード/表示名を新 `Admin` に移行。permissions形式を統一。       |
| その他管理         | HP料金情報                   | `info_charge_hp.php`                                                 | `/admin/settings/hp-pricing`                                               | UIのみ                | 新側は準備中。保存API/DB/公開料金反映が必要。                                    |
| その他管理         | 相互リンク                   | `shop_link.php`                                                      | `/admin/settings/mutual-links`                                             | UIのみ                | 新側は準備中。リンクDB/API/公開反映が必要。                                      |
| その他管理         | ホテル情報                   | `hotel_list.php`, `order_ajax_hotel.php`                             | `/admin/settings/hotel-info`, `/api/settings/hotel`                        | 移行候補あり          | 旧ホテルエリア、料金、予約入力連携を移行。                                       |
| その他管理         | 定型文                       | `info_sentence.php`                                                  | `/admin/settings/templates`                                                | UIのみ                | 新側は準備中。用途別テンプレート、メール/SMS/チャット連携が必要。                |
| その他管理         | メルマガ送信                 | `mail_mag.php`, `mail_mag_p.php`                                     | なし, `lib/email/*`                                                        | 未実装                | 配信対象抽出、履歴、ポイント失効通知、送信停止を移行。                           |
| その他管理         | 男性会員新着情報             | `information_m.php`                                                  | なし                                                                       | 未実装                | 公開先、表示期間、通知有無を確認し実装。                                         |
| その他管理         | 女性会員新着情報             | `information_g.php`                                                  | なし                                                                       | 未実装                | 公開先、表示期間、通知有無を確認し実装。                                         |
| 各種集計           | 売上月間(総合)               | `data_month.php`, `data_month_print.php`                             | `/admin/analytics/monthly-sales`, `/api/analytics/monthly`                 | 一部実装              | 旧 `orders/nippo` 集計式、印刷、前年比/前月比を突合。                            |
| 各種集計           | 売上年間(総合)               | `data_year.php`, `data_year_all*.php`, `data_year_print.php`         | `/admin/analytics/annual-sales`                                            | 一部実装              | 年次集計、全店集計、印刷帳票の再現が必要。                                       |
| 各種集計           | 売上月間(女性別)             | `data_girls.php`, `data_girls2.php`                                  | `/admin/analytics/cast-performance`                                        | 一部実装              | 女性別売上、出勤数、指名/本数、給与との対応を検証。                              |
| 各種集計           | 売上月間(コース別)           | `data_month_course.php`                                              | `/admin/analytics/course-sales`, `/api/analytics/course-sales`             | 一部実装              | 旧コース区分、時間、割引、オプション込み/除外ルールを検証。                      |
| 各種集計           | 売上集計(オプション別)       | `data_option.php`                                                    | `/admin/analytics/option-sales`, `/api/analytics/option-sales`             | 一部実装              | オプション組み合わせ、無料オプション、女性別集計を検証。                         |
| 各種集計           | 売上月間(時間別)             | `data_time.php`                                                      | `/admin/analytics/hourly-sales`, `/api/analytics/hourly-sales`             | 一部実装              | 旧営業時間帯、5:30日付境界、予約開始/終了基準を検証。                            |
| 各種集計           | 売上集計(媒体別)             | `data_media.php`                                                     | `/admin/analytics/marketing-channels`, `/api/analytics/marketing-channels` | 一部実装              | 旧媒体マスタ、電話/WEB/紹介などの分類移行が必要。                                |
| 各種集計           | 売上集計(エリア別)           | `data_area.php`                                                      | `/admin/analytics/area-sales`, `/admin/analytics/district-sales`           | 一部実装              | 旧エリア/市区/駅の粒度を新APIに合わせる。                                        |
| 各種集計           | 売上集計(駅別)               | `data_station.php`                                                   | なし                                                                       | 未実装                | 駅別売上の専用画面/APIが必要。                                                   |
| 各種集計           | 女性登録集計                 | `data_girls_regist.php`                                              | なし                                                                       | 未実装                | 女性登録日/媒体/店舗別の集計が必要。                                             |
| 各種集計           | 会員登録集計                 | `data_member.php`                                                    | `/api/customer/insights` 付近                                              | 未実装                | 会員登録日/媒体/店舗別の管理画面が必要。                                         |
| 各種集計           | 日別データ                   | `data_shop_day.php`                                                  | `/admin/analytics/daily-sales`, `/api/analytics/daily-sales`               | 一部実装              | 旧日別KPI、印刷、修正フローを検証。                                              |
| 各種集計           | 月別データ                   | `data_shop_month.php`                                                | `/admin/analytics/monthly-sales`                                           | 一部実装              | 旧月別KPIと新月次APIの項目差分を突合。                                           |
| 旧コメントアウト   | 撮影スケジュール             | `photographing.php`                                                  | なし                                                                       | 保留/旧コメントアウト | 現行運用が残っているなら撮影管理を実装。                                         |
| 旧コメントアウト   | 性病検査管理/集計            | `girls_disease_list.php`, `girls_disease_data.php`                   | なし                                                                       | 保留/旧コメントアウト | 取り扱い要否とアクセス制御を確認。                                               |
| 旧コメントアウト   | 個別SMS/ポイント失効メルマガ | `sms_send_person.php`, `mail_mag_p.php`                              | SMS/email/points API                                                       | 保留/旧コメントアウト | 現行運用が残るなら外部送信と履歴を実装。                                         |

## 旧PHPファイル別 付録

| 旧PHP                                | 旧領域                    | 新側候補                                                                 | 判定                  |
| ------------------------------------ | ------------------------- | ------------------------------------------------------------------------ | --------------------- |
| `0array.php`                         | 不明/デバッグ             | なし                                                                     | 要仕様確認            |
| `admin_mail.php`                     | 業務連絡                  | `/admin/chat`                                                            | 一部実装              |
| `admin_mail_all.php`                 | 業務連絡                  | `/admin/chat`                                                            | 一部実装              |
| `admin_mail_list.php`                | 業務連絡                  | `/admin/chat`                                                            | 一部実装              |
| `admin_mail_schedule.php`            | 業務連絡/スケジュール通知 | `/admin/chat`, `/admin/cast/weekly-schedule`                             | 要仕様確認            |
| `admin_mail_schedule_today.php`      | 業務連絡/当日通知         | `/admin/chat`, `/admin/cast/weekly-schedule`                             | 要仕様確認            |
| `ajax_admin_menu.php`                | メニュー件数AJAX          | `/admin/dashboard`, API集計                                              | 共通/置換             |
| `ajax_city.php`                      | 地域AJAX                  | `/api/settings/area`                                                     | 移行候補あり          |
| `ajax_city_2018.php`                 | 地域AJAX                  | `/api/settings/area`                                                     | 移行候補あり          |
| `ajax_girls_order.php`               | 女性/予約AJAX             | `/api/reservation`, `/api/cast-schedule`                                 | 一部実装              |
| `ajax_girls_yotei.php`               | 女性出勤AJAX              | `/api/cast-schedule`                                                     | 一部実装              |
| `ajax_girls_yotei_update.php`        | 女性出勤更新AJAX          | `/api/cast-schedule`                                                     | 一部実装              |
| `ajax_station.php`                   | 駅AJAX                    | `/api/settings/station`                                                  | 移行候補あり          |
| `bbs_cm.php`                         | メッセージコメント        | `/admin/chat`                                                            | 一部実装              |
| `bbs_cm_ajax.php`                    | メッセージAJAX            | `/api/chat`                                                              | 一部実装              |
| `bbs_cm_all.php`                     | メッセージ一覧            | `/admin/chat`                                                            | 一部実装              |
| `bbs_list.php`                       | メッセージ一覧            | `/admin/chat`                                                            | 一部実装              |
| `bbs_list_user.php`                  | ユーザーメッセージ        | `/admin/chat`, `/admin/customers/[id]`                                   | 一部実装              |
| `column.php`                         | コラム管理                | なし                                                                     | 未実装                |
| `data_area.php`                      | エリア別売上              | `/admin/analytics/area-sales`                                            | 一部実装              |
| `data_contents.php`                  | コンテンツ集計            | なし                                                                     | 未実装                |
| `data_contents_month.php`            | コンテンツ月次集計        | なし                                                                     | 未実装                |
| `data_contents_year.php`             | コンテンツ年次集計        | なし                                                                     | 未実装                |
| `data_day.php`                       | 日報                      | `/admin/analytics/daily-report`                                          | 一部実装              |
| `data_girls.php`                     | 女性別売上                | `/admin/analytics/cast-performance`                                      | 一部実装              |
| `data_girls2.php`                    | 女性別売上別版            | `/admin/analytics/cast-performance`                                      | 要仕様確認            |
| `data_girls_0625.php`                | 女性別売上旧版/退避       | `/admin/analytics/cast-performance`                                      | 要仕様確認            |
| `data_girls_data.php`                | 女性就業管理              | `/admin/analytics/cast-performance`, `/admin/analytics/staff-attendance` | 一部実装              |
| `data_girls_newsfeed.php`            | 写メ日記集計              | なし                                                                     | 未実装                |
| `data_girls_personal.php`            | 女性個別集計              | `/admin/cast/[id]`, `/admin/analytics/cast-performance`                  | 一部実装              |
| `data_girls_regist.php`              | 女性登録集計              | なし                                                                     | 未実装                |
| `data_media.php`                     | 媒体別売上                | `/admin/analytics/marketing-channels`                                    | 一部実装              |
| `data_member.php`                    | 会員登録集計              | `/api/customer/insights` 付近                                            | 未実装                |
| `data_month.php`                     | 月間売上                  | `/admin/analytics/monthly-sales`                                         | 一部実装              |
| `data_month_course.php`              | コース別売上              | `/admin/analytics/course-sales`                                          | 一部実装              |
| `data_month_print.php`               | 月間売上印刷              | なし                                                                     | 未実装                |
| `data_option.php`                    | オプション別売上          | `/admin/analytics/option-sales`                                          | 一部実装              |
| `data_order_delete.php`              | 予約削除集計              | `/api/reservation/history` 付近                                          | 未実装                |
| `data_point_charge.php`              | ポイント/課金集計         | `/admin/settings/points`, `/api/customer/points`                         | 一部実装              |
| `data_point_member.php`              | 会員ポイント集計          | `/admin/settings/points`, `/api/customer/points`                         | 一部実装              |
| `data_rank_girls.php`                | 女性ランキング            | `/admin/analytics/cast-performance`                                      | 一部実装              |
| `data_shop_day.php`                  | 日別データ                | `/admin/analytics/daily-sales`                                           | 一部実装              |
| `data_shop_month.php`                | 月別データ                | `/admin/analytics/monthly-sales`                                         | 一部実装              |
| `data_station.php`                   | 駅別売上                  | なし                                                                     | 未実装                |
| `data_tanto.php`                     | 担当者別集計              | なし                                                                     | 未実装                |
| `data_time.php`                      | 時間別売上                | `/admin/analytics/hourly-sales`                                          | 一部実装              |
| `data_year.php`                      | 年間売上                  | `/admin/analytics/annual-sales`                                          | 一部実装              |
| `data_year_all.php`                  | 年間全体集計              | `/admin/analytics/annual-sales`                                          | 要仕様確認            |
| `data_year_all2.php`                 | 年間全体集計別版          | `/admin/analytics/annual-sales`                                          | 要仕様確認            |
| `data_year_print.php`                | 年間売上印刷              | なし                                                                     | 未実装                |
| `footer.php`                         | 共通フッター              | Next layout                                                              | 共通/置換             |
| `girls_add.php`                      | 女性詳細/編集             | `/admin/cast/manage/[id]`                                                | 一部実装              |
| `girls_add_ajax.php`                 | 女性編集AJAX              | `/api/cast`                                                              | 一部実装              |
| `girls_cashback.php`                 | 女性バック/報酬           | settlement系                                                             | 未実装                |
| `girls_charge_add.php`               | 女性入金登録              | `/api/admin/cast/settlements`                                            | 一部実装              |
| `girls_charge_admin.php`             | 入金種別管理              | settlement系                                                             | 未実装                |
| `girls_charge_list.php`              | 女性入金月別              | settlement系                                                             | 一部実装              |
| `girls_charge_list_out.php`          | 時給保証/控除系           | settlement系                                                             | 未実装                |
| `girls_charge_list_print.php`        | 入金印刷                  | なし                                                                     | 未実装                |
| `girls_charge_out.php`               | 入金控除/出金             | settlement系                                                             | 未実装                |
| `girls_disease_data.php`             | 性病検査集計              | なし                                                                     | 保留/旧コメントアウト |
| `girls_disease_list.php`             | 性病検査管理              | なし                                                                     | 保留/旧コメントアウト |
| `girls_list.php`                     | 女性一覧                  | `/admin/cast/list`                                                       | 一部実装              |
| `girls_media_adress.php`             | 女性媒体/住所             | `/admin/cast/manage/[id]`                                                | 要仕様確認            |
| `girls_ng_ajax.php`                  | 女性NG AJAX               | `NgCastEntry` 付近                                                       | 一部実装              |
| `girls_ng_list.php`                  | 女性NG一覧                | `NgCastEntry` 付近                                                       | 一部実装              |
| `girls_ng_list_add.php`              | 女性NG追加                | `NgCastEntry` 付近                                                       | 一部実装              |
| `girls_pict.php`                     | 女性画像                  | `/api/upload`, `/admin/cast/manage/[id]`                                 | 一部実装              |
| `girls_point.php`                    | 女性ポイント/評価         | なし                                                                     | 未実装                |
| `girls_recommend_add.php`            | 女性おすすめ              | `/admin/cast/manage/[id]` 付近                                           | 未実装                |
| `girls_regist.php`                   | 女性登録                  | `/admin/cast/manage/[id]`                                                | 一部実装              |
| `girls_repeat_audit.php`             | リピート監査              | なし                                                                     | 未実装                |
| `girls_schedule_add.php`             | 出勤追加                  | `/admin/cast/weekly-schedule`, `/api/cast-schedule`                      | 一部実装              |
| `girls_schedule_add2.php`            | 出勤追加別版              | `/admin/cast/weekly-schedule`, `/api/cast-schedule`                      | 要仕様確認            |
| `girls_schedule_add3.php`            | 出勤追加別版              | `/admin/cast/weekly-schedule`, `/api/cast-schedule`                      | 要仕様確認            |
| `girls_schedule_add_0410.php`        | 出勤追加旧版              | `/admin/cast/weekly-schedule`, `/api/cast-schedule`                      | 要仕様確認            |
| `girls_schedule_list_2019.php`       | 出勤一覧旧版              | `/admin/cast/weekly-schedule`                                            | 要仕様確認            |
| `girls_schedule_list_all.php`        | 出勤一覧詳細              | `/admin/cast/weekly-schedule`                                            | 一部実装              |
| `girls_schedule_list_all2.php`       | 出勤一覧詳細別版          | `/admin/cast/weekly-schedule`                                            | 要仕様確認            |
| `girls_schedule_list_all3.php`       | 出勤一覧詳細別版          | `/admin/cast/weekly-schedule`                                            | 要仕様確認            |
| `girls_schedule_list_all4.php`       | 出勤一覧詳細別版          | `/admin/cast/weekly-schedule`                                            | 要仕様確認            |
| `girls_schedule_list_all5.php`       | 出勤一覧詳細別版          | `/admin/cast/weekly-schedule`                                            | 要仕様確認            |
| `girls_schedule_list_new.php`        | 出勤一覧新旧版            | `/admin/cast/weekly-schedule`                                            | 要仕様確認            |
| `girls_schedule_list_order_new.php`  | 予約付き出勤一覧          | `/admin/cast/weekly-schedule`, `/admin/reservation-list`                 | 一部実装              |
| `girls_schedule_list_order_new2.php` | 予約付き出勤一覧別版      | `/admin/cast/weekly-schedule`, `/admin/reservation-list`                 | 要仕様確認            |
| `girls_schedule_list_order_new3.php` | 予約付き出勤一覧別版      | `/admin/cast/weekly-schedule`, `/admin/reservation-list`                 | 要仕様確認            |
| `girls_schedule_list_order_new4.php` | 予約付き出勤一覧別版      | `/admin/cast/weekly-schedule`, `/admin/reservation-list`                 | 要仕様確認            |
| `girls_schedule_list_order_new5.php` | 予約付き出勤一覧別版      | `/admin/cast/weekly-schedule`, `/admin/reservation-list`                 | 要仕様確認            |
| `girls_schedule_list_week.php`       | 週間予定                  | `/admin/cast/weekly-schedule`                                            | 一部実装              |
| `girls_schedule_list_week2.php`      | 週間予定別版              | `/admin/cast/weekly-schedule`                                            | 要仕様確認            |
| `girls_schedule_list_week3.php`      | 週間予定別版              | `/admin/cast/weekly-schedule`                                            | 要仕様確認            |
| `girls_schedule_list_week_add.php`   | 週間予定追加              | `/admin/cast/weekly-schedule`                                            | 一部実装              |
| `girls_transmit_list.php`            | 女性伝達事項              | `/admin/chat` 付近                                                       | 未実装                |
| `girls_verify.php`                   | 女性本人確認              | `/admin/cast/manage/[id]` 付近                                           | 未実装                |
| `girls_voice.php`                    | 女性向け口コミ/声         | `/admin/reviews` 付近                                                    | 要仕様確認            |
| `header.php`                         | 共通ヘッダー              | Next layout                                                              | 共通/置換             |
| `hotel_list.php`                     | ホテル情報                | `/admin/settings/hotel-info`                                             | 移行候補あり          |
| `image_loader.php`                   | 画像表示/変換             | `/api/upload`, storage                                                   | 共通/置換             |
| `index.php`                          | 管理トップ                | `/admin/dashboard`                                                       | 一部実装              |
| `info_area.php`                      | エリア情報                | `/admin/settings/area-info`                                              | 移行候補あり          |
| `info_campaign_all.php`              | イベント携帯              | `/admin/settings/event-banners`                                          | 保留/旧コメントアウト |
| `info_campaign_all_pc.php`           | イベントPC                | `/admin/settings/event-banners`                                          | 移行候補あり          |
| `info_charge_hp.php`                 | HP料金                    | `/admin/settings/hp-pricing`                                             | UIのみ                |
| `info_document.php`                  | 各種書類                  | なし                                                                     | 保留/旧コメントアウト |
| `info_job.php`                       | 求人情報                  | `/[store]/recruitment` 付近                                              | 保留/旧コメントアウト |
| `info_map.php`                       | 地図                      | `/admin/settings/store-info` 付近                                        | 要仕様確認            |
| `info_media.php`                     | 媒体情報                  | なし                                                                     | 未実装                |
| `info_new.php`                       | 更新情報                  | なし                                                                     | 保留/旧コメントアウト |
| `info_person.php`                    | 管理者情報                | `/admin/settings/admin-info`                                             | 一部実装              |
| `info_person_contents.php`           | 管理者権限/内容           | `/admin/settings/admin-info`                                             | 一部実装              |
| `info_qa.php`                        | FAQ                       | なし                                                                     | 未実装                |
| `info_qa_staff.php`                  | 業務Q&A管理               | なし                                                                     | 未実装                |
| `info_sentence.php`                  | 定型文                    | `/admin/settings/templates`                                              | UIのみ                |
| `info_shop.php`                      | 店舗情報                  | `/admin/settings/store-info`                                             | 一部実装              |
| `info_station.php`                   | 駅情報                    | `/admin/settings/station-info`                                           | 移行候補あり          |
| `info_station_kana.php`              | 駅かな情報                | `/admin/settings/station-info`                                           | 移行候補あり          |
| `info_streetview.php`                | StreetView                | `/admin/settings/store-info` 付近                                        | 要仕様確認            |
| `information_g.php`                  | 女性会員新着              | なし                                                                     | 未実装                |
| `information_m.php`                  | 男性会員新着              | なし                                                                     | 未実装                |
| `mail_mag - Copy.php`                | メルマガ複製              | なし                                                                     | 要仕様確認            |
| `mail_mag.php`                       | メルマガ送信              | なし                                                                     | 未実装                |
| `mail_mag_p.php`                     | ポイント失効メルマガ      | `/api/customer/points/notify-expiring` 付近                              | 保留/旧コメントアウト |
| `member_add.php`                     | 会員詳細/追加             | `/admin/customers/new`, `/admin/customers/[id]`                          | 一部実装              |
| `member_data.php`                    | 会員詳細                  | `/admin/customers/[id]`                                                  | 一部実装              |
| `member_list.php`                    | 会員一覧                  | `/admin/customers`                                                       | 一部実装              |
| `member_list_rank.php`               | 会員ランク一覧            | `/admin/customers` 付近                                                  | 未実装                |
| `member_ng.php`                      | 会員NG                    | `/api/customer/ng`                                                       | 一部実装              |
| `member_ng_tel.php`                  | 電話NG                    | `/api/customer/ng`                                                       | 一部実装              |
| `member_order_new.php`               | 会員予約履歴              | `/api/reservation/history`, `/admin/customers/[id]`                      | 一部実装              |
| `member_point.php`                   | 会員ポイント              | `/api/customer/points`, `/admin/settings/points`                         | 一部実装              |
| `member_private.php`                 | 会員秘密情報              | `/admin/customers/[id]` 付近                                             | 要仕様確認            |
| `member_regist.php`                  | 会員登録                  | `/admin/customers/new`                                                   | 一部実装              |
| `member_request.php`                 | 会員リクエスト            | なし                                                                     | 未実装                |
| `member_request_add.php`             | リクエスト追加            | なし                                                                     | 未実装                |
| `member_request_bbs.php`             | リクエストBBS             | `/admin/chat` 付近                                                       | 未実装                |
| `member_search.php`                  | 会員検索                  | `/admin/search`                                                          | UIのみ                |
| `member_search_new.php`              | 会員検索新                | `/admin/search`                                                          | UIのみ                |
| `member_search_new_ajax.php`         | 会員検索AJAX              | なし                                                                     | UIのみ                |
| `member_voice.php`                   | 口コミ承認                | `/admin/reviews`                                                         | 移行候補あり          |
| `member_voice_add.php`               | 口コミ編集                | `/admin/reviews`                                                         | 移行候補あり          |
| `member_voice_staff.php`             | スタッフ口コミ対応        | `/admin/reviews`                                                         | 要仕様確認            |
| `namatel_list.php`                   | 生電話履歴                | なし                                                                     | 保留/旧コメントアウト |
| `news_feed_cm.php`                   | 日記コメント              | なし                                                                     | 未実装                |
| `news_feed_cm_all.php`               | 日記コメント一覧          | なし                                                                     | 未実装                |
| `news_feed_list.php`                 | 写メ日記管理              | cast diaryのみ                                                           | 未実装                |
| `notion_api.php`                     | Notion連携                | なし                                                                     | 要仕様確認            |
| `order.php`                          | 予約詳細/入力             | `/admin/reservation`, `/api/reservation`                                 | 一部実装              |
| `order2.php`                         | 予約詳細/入力別版         | `/admin/reservation`, `/api/reservation`                                 | 要仕様確認            |
| `order_ajax_hotel.php`               | 予約ホテルAJAX            | `/api/settings/hotel`                                                    | 移行候補あり          |
| `order_ajax_kana.php`                | 予約かなAJAX              | `/api/settings/station`, `/api/settings/area`                            | 移行候補あり          |
| `order_ajax_station.php`             | 予約駅AJAX                | `/api/settings/station`                                                  | 移行候補あり          |
| `order_ajax_station_kana.php`        | 予約駅かなAJAX            | `/api/settings/station`                                                  | 移行候補あり          |
| `order_delete.php`                   | 予約削除                  | `/api/reservation`                                                       | 一部実装              |
| `order_reset.php`                    | 予約リセット              | `/api/reservation`                                                       | 要仕様確認            |
| `order_select.php`                   | 予約一覧                  | `/admin/reservation-list`                                                | 一部実装              |
| `order_set.php`                      | 予約登録/更新             | `/api/reservation`                                                       | 一部実装              |
| `order_set2.php`                     | 予約登録/更新別版         | `/api/reservation`                                                       | 要仕様確認            |
| `order_set3.php`                     | 予約登録/更新別版         | `/api/reservation`                                                       | 要仕様確認            |
| `photographing.php`                  | 撮影スケジュール          | なし                                                                     | 保留/旧コメントアウト |
| `photographing_ajax.php`             | 撮影AJAX                  | なし                                                                     | 保留/旧コメントアウト |
| `qa_staff.php`                       | 業務Q&A                   | なし                                                                     | 未実装                |
| `receive_tel.php`                    | 着信/CTI                  | `components/cti/*`                                                       | 外部連携確認          |
| `shop_calculation.php`               | 店舗計算                  | analytics/settlement系                                                   | 要仕様確認            |
| `shop_info.php`                      | 店舗情報                  | `/admin/settings/store-info`                                             | 一部実装              |
| `shop_link.php`                      | 相互リンク                | `/admin/settings/mutual-links`                                           | UIのみ                |
| `side_menu.php`                      | 旧サイドメニュー          | Next navigation                                                          | 共通/置換             |
| `sms_send.php`                       | SMS送信                   | `lib/sms/*`                                                              | 外部連携確認          |
| `sms_send_person.php`                | 個別SMS送信               | `lib/sms/*`                                                              | 保留/旧コメントアウト |
| `staff_schedule_list_month.php`      | スタッフシフト月          | なし                                                                     | 未実装                |
| `staff_schedule_list_week.php`       | スタッフシフト週          | なし                                                                     | 保留/旧コメントアウト |
| `statuscallback_recive.php`          | SMS/通話callback          | `lib/sms/*`, webhook                                                     | 外部連携確認          |

## 新システム側の主な対応資産

| 領域          | 画面/API/モデル                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 店舗/テナント | `Store`, `StoreSettings`, `/admin/settings/store-info`, `/api/settings/store`, `/api/public/stores/[slug]`                                       |
| 予約          | `Reservation`, `ReservationHistory`, `ReservationLineLog`, `/admin/reservation`, `/admin/reservation-list`, `/api/reservation/*`                 |
| 顧客          | `Customer`, `CustomerPointHistory`, `NgCastEntry`, `/admin/customers`, `/api/customer/*`                                                         |
| 女性/キャスト | `Cast`, `CastSchedule`, `CastOptionSetting`, `/admin/cast/*`, `/api/cast`, `/api/cast-schedule`                                                  |
| 料金          | `CoursePrice`, `OptionPrice`, `DesignationFee`, `/admin/settings/course-info`, `/admin/settings/option-info`, `/admin/settings/designation-fees` |
| 入金/精算     | `SettlementPayment`, `SettlementPaymentReservation`, `/api/admin/cast/settlements`, `/cast/settlements`                                          |
| 地域/ホテル   | `AreaInfo`, `StationInfo`, `HotelSettings`, `/admin/settings/area-info`, `/admin/settings/station-info`, `/admin/settings/hotel-info`            |
| 口コミ        | `Review`, `/admin/reviews`, `/api/review`                                                                                                        |
| チャット      | `Message`, `/admin/chat`, `/api/chat/*`                                                                                                          |
| 決済          | `PaymentIntent`, `PaymentTransaction`, `/api/payments/*`                                                                                         |
| イベント      | `StoreEventBanner`, `/admin/settings/event-banners`, `/api/settings/event-banners`                                                               |

## 優先対応順

1. `gold-esthe.com` の実店舗ID、旧 `shop_rid`、旧 `shop_no`、新 `Store.id/slug` の対応表を確定する。
2. Prisma接続、migration、seedを直し、実DBに対してCRUD確認を通す。
3. 予約、顧客、女性、出勤、日報、入金、ポイントのMySQL-to-PostgreSQL移行ETLを先に作る。
4. 旧メニューのうち「未実装」「UIのみ」を本番必須/後回しに分ける。
5. `typecheck`, `lint`, `test` を通し、`next.config.mjs` の build時ignoreを外せる状態にする。
6. 画像移行、メール/SMS/LINE/CTI/決済/cronを本番環境で個別検証する。
7. 旧管理画面と新管理画面を並行稼働し、予約件数、売上、ポイント、出勤、入金を日次で突合してから切り替える。

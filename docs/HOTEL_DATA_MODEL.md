# ホテルデータモデル

ホテル情報は店舗ごとのマスタとして管理し、予約には正規化した参照と予約時点の表示名を併記します。旧システムの値を新しい意味へ推測変換せず、意味を確定できない値は原文のまま保持します。

## モデル

- `HotelSettings`: 店舗単位のホテルマスタです。`legacyId` は店舗内で一意です。`area` は旧 `hotel_area` マスタの表示グループ名であり、施術対応エリアではありません。住所、電話、客室数、参考料金、チェックイン時刻などは、旧データに存在しない場合を表せるよう nullable とします。削除操作は `isActive = false` の論理削除です。
- `HotelServiceArea`: ホテルと `AreaInfo` の多対多関係です。旧 `hotel_list.city_no` / `city_no2` だけを対応エリアの入力として扱います。`storeId` を含む複合外部キーにより、別店舗のホテルとエリアを結べません。0または空値は関連なしとし、0以外の旧エリアIDを `AreaInfo` に解決できない場合は移行を停止します。
- `HotelRate`: 複数料金を保持します。用途と時間が確認できた値だけ `label`、`durationMinutes`、`amount` に入れます。旧 `price1` から `price4` の意味を確認できない間は、値と出典列を `rawText` に保存し、料金区分を推測しません。
- `Reservation`: `hotelId` はホテルマスタへの任意参照、`hotelName` は予約時点の表示名スナップショットです。旧 `orders.hotel_kin` は売上加算額ではなく、店舗精算用の `hotelExpense` として保持します。

## 旧システムからの対応方針

| 旧フィールド                                | 新しい保存先               | 方針                                                       |
| ------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| `hotel_list.serial`                         | `HotelSettings.legacyId`   | 店舗内で一意に保持                                         |
| `hotel_name`                                | `HotelSettings.hotelName`  | 必須の表示名                                               |
| `station`, `address`, `tel`, `cm`           | ホテルの対応フィールド     | 空値は `null`                                              |
| `hotel_area` / `hotel_list.area_no`         | `HotelSettings.area`       | 旧ホテル表示グループ名を保持。施術対応エリアには変換しない |
| `hotel_list.city_no`, `hotel_list.city_no2` | `HotelServiceArea`         | 0・空値を除き、`AreaInfo` に解決できたものだけ登録         |
| `price1`〜`price4`                          | `HotelRate.rawText`        | 用途を確認するまでラベルや時間を推測しない                 |
| `lev`                                       | `HotelSettings.isActive`   | 旧掲載状態を変換                                           |
| `orders.place_h_no`                         | `Reservation.hotelId`      | 同一店舗のホテルだけ参照可能                               |
| `orders.place_play`                         | `Reservation.hotelName`    | 予約時点の表示名を保持                                     |
| `orders.hotel_kin`                          | `Reservation.hotelExpense` | `additionalFee` には合算しない                             |

2026-07-21の池袋V3 snapshotでは、ホテル2件を `HotelSettings` へ変換しました。両ホテルの `city_no` / `city_no2` は0、`price1`〜`price4` は空であったため、`HotelServiceArea` と `HotelRate` は各0件です。これは欠落ではなく、旧値を推測補完しない変換結果です。ホテル表示グループは1件取得でき、対応する表示グループがない `area_no` では `HotelSettings.area = null` とし、元の値を `HotelSettings.rawText.legacyAreaNo` に保持します。

## 管理画面での扱い

2026-09-05 の設定修正により、`HotelSettings.area` は管理画面の「地域」で確認・編集できます。既存値を保存時に消去せず、地域・最寄り駅／出口・ホテル名を予約の選択肢へ反映します。これはホテルの表示分類であり、施術対応エリアや交通費の割当には変換しません。予約画面では有効なホテルマスタから選び直せます。マスタにないホテルは手入力でき、保存時点の名称を `Reservation.hotelName` に保持します。

## 2026-07-21 preview投入検証

初期化後の池袋preview DBで、`HotelSettings` 2件、`HotelServiceArea` 0件、`HotelRate` 0件を確認しました。予約の `hotelId` 参照と `hotelExpense` も0件で、旧snapshotの値と一致します。管理画面でホテル一覧、追加、非表示の代表操作を確認し、その後preview DBを再初期化・再投入したため、操作確認用ホテルは残っていません。この結果は今回の限定snapshotに対する確認であり、最終本番移行の承認ではありません。

公開HPは `/<store>/hotels` で同一店舗の有効なホテルを表示します。ホテル名・地域・駅／出口・住所・電話だけを読取り、管理メモ・移行原文・予約情報は取得しません。

## API契約

`/api/settings/hotel` はリクエストから店舗を解決し、その店舗への管理権限を確認します。読取は `settings:read`、追加・更新・非表示は `settings:update` が必要です。クライアントが送った `storeId` は採用しません。

成功レスポンスは共通形式 `{ "data": ... }` です。一覧では有効なホテル、サービスエリア、料金だけを表示順で返します。DELETEはレコードを物理削除せず、対象店舗の有効レコードを非表示にします。

## マイグレーション安全策

既存の `HotelSettings` に店舗情報がない場合、Storeがちょうど1件のときだけ自動で割り当てます。Storeが0件または複数件ならトランザクションを停止し、明示的な対応表なしに店舗を推測しません。既存ホテルの削除は行いません。

# 旧本番 read-only extractor / raw→canonical 完全性契約

更新日: 2026-07-20

関連文書: [`LEGACY_DATA_MIGRATION_RUNBOOK.md`](./LEGACY_DATA_MIGRATION_RUNBOOK.md)、[`PREVIEW_UAT_CHECKLIST.md`](./PREVIEW_UAT_CHECKLIST.md)

## 状態と目的

本書は、`gambit-front` の旧本番から安全に snapshot を取得し、raw 行が canonical export へ漏れなく説明されたことを証明する、未実装 extractor の必須契約です。旧本番への接続手順や認証情報を定義するものではありません。

現行 snapshot package v1 verifier が保証する範囲は、artifact の exact-byte SHA-256、table ごとの非空行数、承認済み inventory との一致です。raw 主キー、raw 行 SHA、行ごとの disposition、canonical 行集合との完全一致はまだ検証しません。したがって、次のすべてが実装・独立検証・承認されるまで、現行データの全件 copy、現場 UAT 用全件 preview、本番切替は **No-Go** です。ツールや本書の存在を、実 snapshot の取得または移行完了と扱ってはいけません。

## 信頼境界と実行責任

- 旧本番へのアクセス権を持つ本番運用担当者だけが、承認済み保守枠で extractor を実行する。開発者や preview importer は旧本番へ接続しない。
- DB account は対象 schema に対する必要最小限の read-only 権限だけを持つ。session と transaction の双方で read-only を強制し、DML、DDL、locking read、stored procedure、外部送信、旧アプリの起動を禁止する。
- `/Users/pon/dev/gambit-front/db_sync.php` を含む旧 repository の script は実行しない。extractor は旧 repository を変更せず、旧アプリの runtime や設定ファイルも読み込まない。
- 接続情報は秘密管理経由で process に渡し、引数、shell history、環境 dump、package、report、Git に残さない。抽出後は credential をローテーション可能な独立 account とする。
- package 作業領域は実行 UID 所有の private directory とし、未完了 package は importer が発見しても受理できない名前・marker にする。全 artifact の検証成功後だけ atomic に final 化する。
- 旧本番の負荷上限、transaction の最大継続時間、中止判断者を事前承認する。負荷超過時は read-only transaction を中止し、不完全 package を破棄する。

## Snapshot の整合性境界

### v1: 単一 origin のみ

snapshot package v1 の `consistency: "transaction-snapshot"` は、一つの `authoritativeOrigin` と、同じ consistent read transaction 内で取得した table 群にだけ使用できます。base table、空 partition、`*_YYYY` table、照合専用 replica を承認 policy どおりすべて列挙します。

次は禁止します。

- 別 DB、別 server、別 transaction の結果へ同じ `authoritativeOrigin` を付ける。
- 取得時刻が近いという理由だけで複数 origin を同一 snapshot とみなす。
- transaction を失った後に途中から再開し、別 snapshot の行を同じ package へ混ぜる。
- 中央会員 DB の部分結果を、店舗 DB 群を含む全件移行として表示する。

### 将来の複数 origin

中央会員 DB と店舗 DB 群を跨ぐ取得は、現行 v1 へ追加 field を紛れ込ませず、version を上げた coordinated-cutoff 契約として実装します。少なくとも次を署名済み control へ固定します。

- origin ごとの snapshot identity、開始・終了時刻、DB clock、engine/version、transaction isolation、read-only 状態。
- origin ごとの GTID、binlog position、LSN または同等の検証可能な high-water mark。
- 全 origin の書込停止区間、または snapshot 間の全変更を覆う追補 log の始点・終点・完全性 digest。
- source 間参照、会員統合、ポイント、予約の global reconciliation と、その承認 policy の SHA-256。
- 追補適用後に全 origin が同じ業務 cutoff を表すことを独立 verifier が再計算できる証跡。

自己申告 timestamp だけの coordinated snapshot は受理しません。上記方式が承認・実装されるまでは、複数 origin を含む全件 preview は No-Go です。

## 承認 policy と column inventory

extractor は「DB に存在したもの」を実行時に自動採用せず、version 固定された承認 policy を入力にします。policy は少なくとも次を exact 値で固定します。

- `sourceKey`、`authoritativeOrigin`、extractor version、変換 policy version、code revision / executable SHA-256。
- schema-only SQL と static catalog の SHA-256。
- 対象 table、base / 年次 partition、各 table の `canonical-source | reconciliation-only`、主キー列と型、決定的 sort 規則。
- 全物理列の disposition: `included-business-data`、`forbidden-credential`、`approved-omitted` のいずれか一つ。
- raw 行 disposition と画像 disposition に使用可能な固定 reason code、および各 rule の承認 ID / policy digest。
- canonical entity と field の mapping、時刻・文字列・数値・NULL の変換規則、店舗対応、対象期間。

schema に未承認 table / partition / column が一つでもある場合、または主キーとして承認した一意 key が実 schema にない場合は停止します。行番号、取得順、row hash だけを主キー代わりにしてはいけません。一意 key を定義できない table は、全件移行の blocker として扱います。

## Credential と秘密情報の除外

- SQL は `SELECT *` を使わず、承認済み business column と主キーだけを明示します。
- password、password hash、reset token、session、OAuth / API / SMS credential、秘密鍵、接続先秘密、暗号化 key などは DB から値を取得せず、raw envelope、canonical export、画像 manifest、checkpoint、report に一切書きません。
- schema inventory 上は credential column の存在と型を確認し、column disposition を `forbidden-credential` として固定します。値の count、length、hash、サンプルも出力しません。
- 新規・改名された列が deny rule または未承認列に該当した場合は停止し、推測で business column として採用しません。
- 会員認証は承認済み本人確認・password 再設定方式で行い、旧 credential を移行しません。

`rawRowSha256` は、主キーと承認済み非 credential projection の全値を対象にする SHA-256 です。credential を hash して残すことも禁止します。

## Raw table artifact

各 table は UTF-8、LF、1行1object、blank 行なしの strict NDJSON（必要なら deterministic gzip）として出力します。parser は duplicate JSON key、未知 field、非 object 行、不正 UTF-8、末尾 garbage を拒否します。同等形式を採用する場合も、以下の情報と集合証明を lossless に再現できることが必要です。

概念 envelope は次のとおりです。これは現行 parser が実装済みという意味ではありません。

```json
{
  "version": 1,
  "source": {
    "sourceKey": "approved-source-key",
    "origin": "shop_gold",
    "physicalTable": "orders_2025"
  },
  "primaryKey": [{ "column": "id", "type": "signed-integer", "value": "123" }],
  "row": [{ "column": "status", "type": "signed-integer", "value": "2" }],
  "rawRowSha256": "<64文字の小文字SHA-256>",
  "disposition": {
    "kind": "canonical",
    "canonicalRefs": [
      {
        "role": "owner",
        "entity": "reservations",
        "source_table": "shop_gold.orders_2025",
        "id": "shop_gold.orders_2025:123",
        "canonicalRowSha256": "<64文字の小文字SHA-256>"
      }
    ]
  }
}
```

### 値表現と digest

- `primaryKey` と `row` は承認された全列を列名昇順で一度ずつ含める。主キー列を `row` へ重複させない。
- SQL integer / decimal は JSON number ではなく符号付き10進文字列、binary は base64、date / time / datetime は型を保持した規定文字列、text は妥当な UTF-8、NULL は専用 `null` 型で表す。暗黙の丸め、timezone 付与、Unicode 正規化を raw 値へ行わない。
- composite key は承認済み列順の typed tuple とする。比較は型別の全順序を policy で固定し、DB collation や locale に依存させない。
- `rawRowSha256` は domain-separated SHA-256 とし、`source`、`primaryKey`、`row` の RFC 8785 canonical JSON を対象にする。`disposition` と digest 自身は含めない。
- canonical 行 SHA も別 domain の RFC 8785 canonical JSON から計算し、entity、`source_table`、opaque `id` を含む行全体へ固定する。
- table artifact は typed primary key 順に出力する。gzip を使う場合は timestamp、original filename、OS field、compression option を固定し、同じ入力から exact bytes が再現されるようにする。
- manifest の `sha256` は現行どおり圧縮後 artifact の exact bytes とする。semantic digest で代用しない。

domain separator、canonical JSON 実装、型 tag、sort comparator は extractor と独立 verifier で共有する versioned specification に固定します。

## 主キー・件数・raw 集合の証明

各 required table について、同一 read-only snapshot 内で source query と artifact からそれぞれ次を計算します。

1. source の `COUNT(*)`、主キー最小・最大。
2. emitted envelope の件数、主キー一意性、最小・最大。
3. 主キーと `rawRowSha256` の length-prefixed pair を主キー順に連結した `rawSetSha256`。
4. disposition の固定 field だけを同じ順で連結した `dispositionSetSha256`。

合格条件は次のすべてです。

- source count = envelope count = manifest `rowCount`。
- `rowCount = 0` なら `minPrimaryKey` / `maxPrimaryKey` は存在せず、0より大きければ両方必須。
- envelope の主キー重複が0で、source と artifact の min / max が一致する。
- manifest の min / max は envelope から再計算し、自己申告値を信用しない。
- exact-byte SHA、`rawSetSha256`、`dispositionSetSha256` が承認 control と一致する。
- 空の base / 年次 partition と `reconciliation-only` table も inventory と集合計算から省略しない。

現行 package v1 manifest には semantic set digest と reconciliation ledger の固定先がありません。実装時は、後方互換を装って v1 の意味を変更せず、package version を上げるか、package manifest と preview control の双方から SHA-256 で参照される strict reconciliation artifact を追加します。現行 verifier の `artifact-integrity-only` 成功だけで本節を合格扱いしてはいけません。

## 全 raw 行の disposition

すべての raw identity（`origin`、`physicalTable`、typed primary key）は、同じ envelope 内で次のいずれか一つだけを持ちます。

- `canonical`: 1件以上の `canonicalRefs` を持つ。1 raw 行から複数 canonical 行が生成される場合も全参照を列挙する。
- `excluded-approved`: canonical 行を生成しない。policy に固定された reason code、承認 ID、承認 policy digest を必須とする。
- `unsupported-blocking`: canonical 行を生成できない理由を固定 code で記録する。これは preview / full-copy の blocker であり、0件になるか承認済み参照 archive へ移すまで Go にしない。

`canonical` と除外を同じ raw 行へ併記したり、自由記述理由、値に応じた未承認除外、暗黙の drop を行ったりしてはいけません。`excluded-approved` は承認された移行 scope から意図的に外す証拠であり、「旧履歴を全件利用可能にする」という目標に含まれる行を除外する根拠にはなりません。

複数 raw 行を一つの canonical 行へ統合する場合、各参照に `owner | supporting` を付けます。各 canonical identity は exactly one の `owner` を持ち、0件以上の `supporting` を持てます。supporting 行も未処理扱いにはなりません。

## Canonical export との exact set equality

canonical identity は `entity + source_table + opaque id` です。現行7 entity は `stores`、`courses`、`casts`、`customers`、`reservations`、`castSchedules`、`pointHistories` であり、追加 entity は変換 policy version を上げて承認します。

独立 verifier は raw artifact と canonical export の両方から集合を再構成し、次をすべて確認します。

1. raw identity 集合 = disposition を持つ raw identity 集合。欠落、余分、重複がない。
2. canonical export 内の identity は一意で、各行の再計算 SHA が `canonicalRowSha256` と一致する。
3. canonical export identity 集合 = `owner` canonical ref 集合。未由来の canonical 行と未出力の owner がない。
4. 全 `supporting` ref の canonical identity が export に存在し、同じ canonical row SHA を指す。
5. canonical 行の `source_table` が approved `canonical-source` table に属し、opaque `id` prefix と一致する。
6. table / entity / disposition 別件数と set digest を2回の独立計算で一致させる。

件数だけの一致、min / max だけの一致、canonical 側から raw 側への片方向参照だけでは合格にしません。差分が1件でもあれば canonical export を importer へ渡しません。

## 画像の完全性

DB snapshot と同じ scope に属する画像参照、および承認済み storage root で発見した全fileについて、次の disposition を一つだけ記録します。

- `public-preview`: 現行 public image manifest の owner、slot、target path、size、SHA-256、実 MIME、width、heightへ exact に対応する。
- `private-archive`: 公開せず、別の承認済み暗号化 archive inventory と retention policy に対応する。
- `excluded-approved`: 固定 reason code と承認証跡を持つ。
- `unsupported-blocking`: 未解決として preview / full-copy を停止する。

合格条件は、DB画像参照集合、storage上の対象file集合、画像 disposition集合が相互に説明され、public manifest に未参照・不足・余分・owner不一致がないことです。file bytes は immutable storage snapshot または書込停止後のcopyから読み、読取前後のidentity / size / mtime と SHA-256 を確認します。DB transaction と画像 snapshot の cutoff が一致しない場合は coordinated-cutoff blocker とします。

現行 preview importer が copy するのは承認済み public image だけです。private image の inventory / archive が未実装のまま、画像全件移行済みと表示してはいけません。

## Cutoff 証跡

restricted control artifact には、値を第三者が検証できる形で次を固定し、artifact 自体の SHA-256 を package と承認記録へ結びます。

- `capturedAt`、業務上の `cutoffAt`、DB timezone / clock、transaction 開始・終了、snapshot identity。
- DB engine/version、isolation、read-only 状態、charset、collation、時刻解釈に影響する session 設定。
- table / partition inventory、schema digest、static catalog digest、row / disposition / canonical set digest。
- extractor executable digest、code revision、dependency lock digest、policy digest、実行者と承認者。
- 画像 snapshot identity と、DB cutoff へ揃えた方法。

timestamp は snapshot identity の代わりになりません。証跡不足、clock 不整合、snapshot transaction 中断、cutoff 後の source 行混入を検出した場合は package 全体を失敗させます。

## Report と診断情報

CLI と通常 reconciliation report は fixed issue code、対象分類、aggregate count、digest、成功 / No-Go 判定だけを返します。氏名、電話、メール、住所、旧ID、raw 値、任意 column 名、sourceKey、DB名、host、DSN、path、credential、自由記述 error を出しません。

行単位の調査が必要な場合は、raw identity そのものではなく run 固有 HMAC token と固定 reason code を restricted diagnostic artifact に保存します。HMAC key は package に含めません。restricted artifact も owner-only、暗号化、期限付きとし、credential 値だけは例外なく記録しません。parser、filesystem、DB driver の生 error message を利用者向け出力へ流さず、内部原因から固定 code へ変換します。

## Performance と resume 境界

- raw artifact と set digest は streaming で生成・検証し、全tableをmemoryへ保持しない。canonical export が現行 512 MiB 上限または実行環境のmemory / transaction上限へ近づく場合、上限を黙って上げず、streaming形式とpackage versionを先に設計する。
- 最大row数、最大artifact bytes、memory、temporary disk、DB read rate、transaction時間、画像file数・総bytesを事前計測し、承認上限を超える前に fail closed する。
- checkpoint は immutable chunk identity、snapshot identity、最終承認済みtyped key、chunk digestだけをprivate領域へ保存する。同じ live snapshot sessionが継続していることを証明できないresumeは禁止する。
- DB connection / snapshotを失った場合、v1はpackage全体を破棄して新しいrunとして最初から取得する。別runのchunkを結合しない。
- image resume はimmutable storage snapshotと既検証chunk digestが一致する場合だけ許可する。最終set equalityは全fileについて再計算する。
- crash、容量不足、timeout、operator中止では final manifest を発行しない。cleanup不能な残存物はrestricted quarantineへ隔離し、受理対象にしない。
- 本番相当件数の安全なreplicaまたは匿名化fixtureで所要時間を測り、previewと本番の停止枠、DB負荷枠、storage容量に収まる証拠を残す。

## 必須 acceptance test

実装は TDD で、少なくとも次を自動 test と独立 rehearsal で通します。

1. read-only account / transaction 以外、未承認 SQL、旧script実行を拒否する。
2. duplicate JSON key、未知field、blank行、不正UTF-8、途中切断、symlink、所有者・mode不正、読取中変更を拒否する。
3. 空table、1行、composite key、年次partitionで件数・PK一意性・min/maxを正しく再計算する。
4. 行追加、行欠落、duplicate PK、raw値変更、row hash改変、並び替え、artifact byte改変を必ず検出する。
5. raw行ごとのdisposition欠落・重複、未承認reason、自由記述reason、unsupported 1件をNo-Goにする。
6. canonical行の追加・欠落・重複・hash変更、owner欠落・複数owner、dangling supporting refを検出する。
7. canonical identity set と owner ref set の exact equality、および全raw identityとdisposition identityのexact equalityを正例で証明する。
8. credential canary、credential列の追加・改名、`SELECT *`、secretを含むerrorを拒否し、全artifact / reportの漏えいscanを通す。
9. public / private画像の不足・余分・checksum・MIME・寸法・owner・slot・cutoff不一致を検出する。
10. 複数originをv1として申告したpackage、別transactionのchunk混在、snapshot喪失後resumeを拒否する。
11. 同じimmutable fixtureと同じversion/policyから2回生成した全artifactのexact bytes、全digest、generic reportが一致する。
12. interruptionでは未完了packageが受理不能で、clean restart後だけfinal化される。
13. 本番相当volumeでmemory、disk、DB負荷、runtimeが承認上限内に収まり、独立verifierが同じ結果を返す。
14. generic reportとrestricted diagnosticの双方にcredentialがなく、generic reportにPII、旧ID、path、driver生messageがない。

## Go 判定

次がすべて揃った場合にだけ、read-only snapshot を隔離 preview へ渡せます。

- extractor と独立 verifier の code / dependency / policy version が固定され、上記 acceptance test が成功している。
- operator-owned の実 snapshot が単一 origin v1、または承認済み coordinated-cutoff version の条件を満たす。
- raw、disposition、canonical、画像の集合証明がすべて一致し、`unsupported-blocking = 0`、未承認除外 = 0である。
- schema、件数、PK境界、exact-byte SHA、semantic set digest、cutoff証跡が承認controlと一致する。
- generic reconciliation reportに差分がなく、restricted artifactの保護と保存期限が確認されている。
- 既存ランブックの業務変換、隔離preview、突合、UATゲートも別途すべて合格している。

この契約を満たす extractor / verifier と実 snapshot はまだ存在しません。旧本番・旧DB・旧serverからの実データcopyも実施していません。よって、本書作成時点の判定は引き続き **No-Go** です。

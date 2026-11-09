# CI 原本取得の共有と検証

## 原因として確認できた事実

6b3c489の[PR側SIQS lab job](https://github.com/Xpotato1024/browser-prime-toolkit/actions/runs/42528000026/job/128875786251)は、GMP 6.1.2の固定原本を取得する際にgmplib.orgとftp.gnu.orgの両方が接続10秒でtimeoutとなった。browser検査には未到達だった。同headのpush側全9workflowは成功した。旧9cfの期限検査失敗とは別の原因である。

従来は総合CIの5jobが独立に外部原本を取得していた。push/PRの両イベントは実行identityが異なるので維持し、各実行内の取得重複を取り除く。全ての通信障害が無くなるとは主張しない。

## 構成

[原本共有契約](../contracts/ci-source-archives.md)に従い、producerで固定9archive（7,003,745 bytes）を取得・検証する。exact identity cacheを使用できる場合も、全file/size/SHAを再検証する。同じrunの単一artifact IDを5consumerへ渡し、各checkoutのmanifestで再検証してから既存ビルドを行う。

producer失敗をrequired jobのskipped成功にしない。既存5jobをalways入口にして最初のstepでsource成功を要求する。各consumerの独立2ビルド、native、byte一致、全件/限定試験、実browserは削除しない。consumerはcache-onlyで外部sourceサイトへ接続しない。

## 供給元とactionの確認

- [GNU公式mirror一覧](https://www.gnu.org/prep/ftp.html)に掲載された[Linux Kernel Archives GNU mirror](https://mirrors.kernel.org/gnu/)を第3の有限経路へ追加。GMP 6.1.2と6.3.0の両archiveを実取得し、既存のsize/SHA pinと一致した。先行2接続timeoutを注入し、第3経路からの実取得を確認した。
- actions/cache restore/save: [55cc8345863c7cc4c66a329aec7e433d2d1c52a9](https://github.com/actions/cache/tree/55cc8345863c7cc4c66a329aec7e433d2d1c52a9)、v6.1.0。
- actions/upload-artifact: [cf430e030ddbb5b0abf93d22962f4752f3646cd9](https://github.com/actions/upload-artifact/tree/cf430e030ddbb5b0abf93d22962f4752f3646cd9)、v7.0.2。
- actions/download-artifact: [9000827ccba6bdab643e8b6fd33ac0654aef8333](https://github.com/actions/download-artifact/tree/9000827ccba6bdab643e8b6fd33ac0654aef8333)、v8.0.2。
- 独立reviewで各pinのofficial repository、MIT license、Node24 metadata、関係するcache/artifact処理を確認した。bundled依存全体の監査ではない。contents: readを維持し、新tokenや権限は追加しない。cache保存の可否は検証の正しさの根拠にしない。

## 検証

- TDD: 2接続timeout後の第3経路を要求する試験は旧実装でInvalid transport planとなり5成功/1失敗。cache-only欠落時のnetwork禁止も旧実装で失敗し、実装修正後に両方が通過した。
- 関連29試験が通過。mirror改竄/短いfile/TLS/全経路失敗、正常・欠落・破損・余分・非regular・symlink cache、exact keyと不整合hit、consumerのnetwork禁止、既存required名への失敗伝播、元のビルドgate維持を検査した。
- 実cold producerで9archiveを取得・検証し、全件が固定pinと一致。別の5consumer用directoryへraw fileを複製し、curlが存在しないPATHでunion検証とcache-only importerが全て成功した。共有後のconsumerにsource downloadは不要だった。
- YAMLをparserで読み、15job、両イベント、5つのfail-closed依存を確認した。独立read-only source/workflow reviewでblocking指摘なし。
- この記録はHosted CI cache/artifactサービスでの成功を主張しない。最終commitのHosted CIと全件test/checkはPRの引渡し証跡で報告する。

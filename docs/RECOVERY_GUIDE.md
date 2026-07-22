# データベース障害の診断・復旧手順

確認日：2026年7月18日

## 現時点の診断

| 確認結果 | 判定 | 根拠の強さ |
| --- | --- | --- |
| Netlifyの画面は表示できる | 確認済み | 高 |
| Renderは「Service waking up / Application loading」のままAPI応答まで到達しない | 確認済み | 高 |
| ローカルDBでは作成・取得・更新・使用回数加算・削除が成功する | 確認済み | 高 |
| Supabase無料プロジェクトが低利用により一時停止している | 有力な仮説。管理画面で要確認 | 中〜高 |

コードの基本的なCRUD処理は動いています。公開環境では、Render起動時にPostgreSQLへ接続できず、FastAPIの準備が完了していない可能性が高い状態です。

Supabase公式情報では、Free Planの低利用プロジェクトは7日間の活動状況により一時停止の対象になります。重要部分の日本語訳は「無料プランのプロジェクトは、7日間の活動が少ない場合、サーバー資源節約のため一時停止される」です。

- [Supabase公式：Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

Render公式情報では、無料Webサービスは15分間アクセスがないと休止し、次回アクセス時の再起動に約1分かかります。重要部分の日本語訳は「無料Webサービスは15分間通信がないと停止し、次のリクエストで再起動する」です。

- [Render公式：Deploy for Free](https://render.com/docs/free)

## 復旧手順

### 1. Supabaseを確認

1. Supabase Dashboardを開く
2. 対象プロジェクトに`Paused`または`Restore project`が表示されていないか確認
3. 停止中なら復元する
4. 復元完了まで待つ
5. Database接続情報が以前と同じか確認する

ここはアカウント所有者だけが確認できるため、この診断資料だけでは断定できません。

### 2. Renderの環境変数を確認

Renderの対象サービスで次を確認します。

- `DATABASE_URL`：現在のSupabase接続文字列
- `JWT_SECRET_KEY`：32文字以上のランダム値
- `CORS_ORIGINS`：NetlifyのURL
- 初回のみ`INITIAL_ADMIN_USERNAME`と`INITIAL_ADMIN_PASSWORD`

接続文字列やパスワードは、GitHubやチャットへ貼り付けないでください。

### 3. Renderを再起動

Supabase復元と環境変数確認後、RenderでManual DeployまたはRestart Serviceを実行します。

### 4. 順番に確認

1. `https://RenderのURL/health/live` → `{"status":"ok"}`
2. `https://RenderのURL/health/ready` → `{"status":"ready","database":"connected"}`
3. Netlifyを開く
4. 初期管理者でログイン
5. テスト投稿を作成
6. ページを再読み込みして投稿が残っていることを確認

## 無料プラン利用時の注意

RenderとSupabaseの両方が休止する可能性があります。そのため、ポートフォリオ提出時には初回表示が遅くなることがあります。

提出用の一時確認であれば無料プランでも運用できますが、クライアントの実業務で常時利用する場合は、有料プランまたはクライアント管理インフラを前提に可用性を設計する必要があります。

根拠の強さ：高。無料プランの休止仕様は各社公式資料で確認可能です。

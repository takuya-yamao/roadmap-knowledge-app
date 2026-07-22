# クライアント向けDB・認証差し替えガイド

## データベースの差し替え

アプリのコードには接続先を書かず、Renderなどの環境変数`DATABASE_URL`へ設定します。

```text
同じアプリ本体
    ↓
クライアントAのDATABASE_URL → A社PostgreSQL
クライアントBのDATABASE_URL → B社PostgreSQL
```

クライアントごとの作業は、原則として次の3点です。

1. クライアント用PostgreSQLを用意
2. `DATABASE_URL`を変更
3. サービスを再起動して`/health/ready`を確認

### 対応範囲

- PostgreSQL → PostgreSQL：接続文字列の変更で対応可能
- Supabase → 別のPostgreSQLサービス：原則対応可能
- SQLite：ローカル開発・自動テスト用
- MySQL、SQL Server、Oracle：ドライバー、JSON型、SQL互換性の確認とコード調整が必要

「SQLAlchemyを使っているから、どんなDBでも無修正」という意味ではありません。今回の提出版で即時差し替え対象とするのはPostgreSQLです。

## フロントエンドのAPI差し替え

Netlifyの`VITE_API_URL`を変更します。

```env
VITE_API_URL=https://client-api.example.com
```

Reactのコードを書き換える必要はありません。

## CORSの差し替え

FastAPIの`CORS_ORIGINS`へ、そのクライアントが使用する画面のURLをカンマ区切りで登録します。

```env
CORS_ORIGINS=https://knowledge.client.example,https://staging.client.example
```

`*`ですべて許可する設定は、提出版では採用していません。

## アカウント方式

### 提出版の初期状態：デモモード（ログイン不要）

貴社の既存アカウント基盤に合わせて作り込む前提のため、**提出版は初期状態でログインを求めません**。
アカウント管理の「画面」も同梱していません。切り替えは環境変数だけで行えます。

| 場所 | 変数 | デモ（初期値） | ログインあり |
| --- | --- | --- | --- |
| バックエンド | `DEMO_MODE` | `true` | `false` |
| フロントエンド | `VITE_DEMO_MODE` | `true` | `false` |

> ⚠️ デモモード中は認証を通しません。**実在の個人情報や機密情報は入れないでください。**

手順は [MAINTENANCE_GUIDE.md](MAINTENANCE_GUIDE.md) の1章にまとめています。

### ログインを有効にした場合の仕組み（実装済み）

- パスワードは平文保存せず、Argon2ハッシュとして保存
- ログイン成功時に期限付きJWTを発行
- APIはJWTから本人を確認し、DB上の最新権限を確認
- パスワード再設定時は、それ以前のJWTを無効化
- 最低1人の有効な管理者を残す

認証処理は`backend/auth.py`へ集約しています。
アカウントの作成・権限変更・停止・パスワード再設定のAPIは`backend/main.py`の`/users`系に揃っており、
管理画面を貴社仕様で実装する際にそのまま利用できます。

## クライアントのSSOへ変更する場合

クライアント側で次の一次情報を確認する必要があります。

- IdP：Microsoft Entra ID、Okta、Google Workspaceなど
- 方式：OpenID Connect、OAuth 2.0、SAMLなど
- トークンの発行者、対象者、署名鍵、期限
- 社員IDやメールアドレスをどのクレームから取得するか
- 管理者権限をグループ情報から判定できるか
- 退職・異動時のアカウント停止方法

これらは現時点では不明です。したがって、SSO部分の「完全な無設定差し替え」は未実装です。

実装時は主に`backend/auth.py`のトークン検証をクライアントIdP向けへ変更し、取得した社員情報を`users`テーブルの権限へ対応付けます。投稿API側の権限検査はそのまま再利用できます。

## 初期管理者

初回だけ次を環境変数へ設定します。

```env
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=十分に長い初期パスワード
```

作成確認後、`INITIAL_ADMIN_PASSWORD`は環境変数から削除してください。別の方法として、管理者がサーバー上で`python init_db.py --username admin`を実行できます。

## デモ環境として公開する場合のチェック

- [ ] `DEMO_MODE`と`VITE_DEMO_MODE`が両方とも`true`になっている
- [ ] `DATABASE_URL`を設定した（デモモードでも必須）
- [ ] `CORS_ORIGINS`を画面のURLだけに限定した
- [ ] **実在の個人情報・機密情報を登録していない**（認証がかからないため）

## 実業務で使う場合のチェック（ログイン有効化）

- [ ] `DEMO_MODE`と`VITE_DEMO_MODE`を両方とも`false`にした
- [ ] 本番用PostgreSQLが用意されている
- [ ] `DATABASE_URL`を秘密情報として登録した
- [ ] `JWT_SECRET_KEY`をクライアントごとに生成した
- [ ] `CORS_ORIGINS`を正確なURLだけに限定した
- [ ] 初期管理者でログインできた
- [ ] 一般利用者が投稿・削除・ユーザー管理できないことを確認した
- [ ] パスワード再設定後、旧ログインが無効になることを確認した
- [ ] アカウント管理画面を自社で用意した（提出版には画面を同梱していません）
- [ ] バックアップ、監視、障害連絡先を決めた
- [ ] 無料プランを実業務へ使用しないか、休止リスクを合意した

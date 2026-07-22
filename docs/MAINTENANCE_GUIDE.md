# 取扱説明書（保守マニュアル）

このアプリを引き継いだ方が、「何を変えたい時に、どのファイルのどこを直せばよいか」を
すぐ分かるようにまとめた資料です。プログラミングに詳しくない方でも追えるように書いています。

---

## 0. まず全体像

| 部品 | 役割 | 主なフォルダ／ファイル |
| --- | --- | --- |
| フロントエンド（画面） | 利用者が見て操作する画面 | `src/App.jsx`, `src/App.css`, `src/api.js` |
| バックエンド（API） | データの保存・取得・認証・権限チェック | `backend/` フォルダ |
| データベース | ナレッジとアカウントの保存場所 | 環境変数 `DATABASE_URL` で指定 |
| 設定（環境変数） | 接続先や動作モードの切り替え | `.env`（フロント）, `backend/.env`（API） |

- 画面の見た目・文言 → `src/` を触ります。
- 保存・権限・ログインの仕組み → `backend/` を触ります。
- 接続先やON/OFFの切り替え → `.env`（コードは変更しません）。

> `.env` は秘密情報を含むためGitHubには上げません（`.gitignore`で除外済み）。
> 設定項目の見本は `.env.example` と `backend/.env.example` にあります。

---

## 1.【最重要】デモモードと本番モード（ログインあり）の切り替え

このアプリは初期状態が **デモモード** です。
デモモードでは **ログインせずに全機能を使えます**（アカウントを用意しなくてよい）。

クライアントの既存システムとアカウント連携する時など、
ログインを有効化したい時は **環境変数を2つ変えるだけ** です。コードは変更しません。

### 切り替え方法

| 場所 | 変数 | デモ（初期値） | 本番（ログインあり） |
| --- | --- | --- | --- |
| バックエンド（Render等） | `DEMO_MODE` | `true` | `false` |
| フロントエンド（Netlify等） | `VITE_DEMO_MODE` | `true` | `false` |

- **必ず2つを同じ値に揃えてください。** 片方だけ変えると画面とAPIの動作がずれます。
  （ずれた場合は画面に「同じ値に揃えてください」という案内が出ます。）
- `true` として扱われるのは `true` / `1` / `yes` / `on` の4つだけです（大文字小文字は区別しません）。
  それ以外はすべて `false` 扱いです。画面とAPIで同じ判定になるよう揃えてあります。
- 変更後は、Render（API）とNetlify（画面）をそれぞれ再デプロイ／再起動します。

### どちらのモードでも必ず必要な設定

> **`DATABASE_URL` はデモモードでも必須です。**
> ナレッジの保存先そのものなので、未設定だとAPIは起動せず
> `DATABASE_URL is not set.` というエラーで止まります（`backend/database.py`）。
> 「デモモード＝何も設定しなくても動く」ではない点にご注意ください。

### 本番モード（ログインあり）にする時の追加設定

`false` にすると認証が有効になるため、以下も設定してください（詳細は
[docs/CLIENT_HANDOFF.md](CLIENT_HANDOFF.md) の「初期管理者」参照）。

1. `JWT_SECRET_KEY` … 32文字以上のランダム文字列（デモモードでは未使用）
2. `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD` … 最初の管理者（作成後にパスワードは消す）

ランダムな文字列の作り方：

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 仕組み（どのコードが効いているか）

デモモードのON/OFFを判定しているのは次の箇所です。**通常は触りません**が、
挙動を確認したい時のために記載します。

| 役割 | ファイル | 目印 |
| --- | --- | --- |
| APIの設定読み込み | `backend/config.py` | `demo_mode=_as_bool(os.getenv("DEMO_MODE"), True)` |
| APIの認証スキップ | `backend/auth.py` | `if settings.demo_mode:` のある `get_current_user` と `demo_user()` |
| 画面の判定 | `src/api.js` | `export const DEMO_MODE = ...` |
| 画面のログイン省略 | `src/App.jsx` | `DEMO_MODE ? DEMO_USER : null`、`Header` 内の `{!DEMO_MODE && ...}` |

### アカウント管理画面について（重要）

**アカウント管理の「画面」は、この提出版では意図的に外しています。**
クライアントの既存システムに合わせてアカウント周りを作り直す想定のため、
中途半端な独自画面を残さない方が移行しやすいと判断したものです。

一方で、**サーバー側の仕組みはすべて残しています**。

| 種類 | 状態 | 場所 |
| --- | --- | --- |
| ログイン・JWT発行 | 残っている | `backend/auth.py`, `backend/main.py` の `/auth/login` |
| パスワードのArgon2暗号化 | 残っている | `backend/auth.py` の `hash_password` |
| 管理者/利用者の権限チェック | 残っている | `backend/auth.py` の `require_admin` |
| アカウント作成・権限変更・停止・パスワード再設定 のAPI | 残っている | `backend/main.py` の `/users` 系 |
| アカウント管理の画面（React） | **削除済み** | 復元するにはGit履歴の `UserManagement` を参照 |
| ログイン画面（React） | 残っている | `src/App.jsx` の `LoginPage` |

つまりクライアントは、**サーバー側の権限の仕組みをそのまま使いながら、
画面だけ自社の運用に合わせて作る**ことができます。
自社のIdP（SSO）に寄せる場合は次の2章を参照してください。

> ⚠️ デモモード中は認証がかかっていないため、`/users` などのAPIも誰でも呼べます。
> **デモ環境には実在の個人情報や機密情報を入れないでください。**
> 実データを扱う時は必ず `DEMO_MODE=false` にしてください。

---

## 2. クライアントの既存アカウント／SSOへ連携する時

クライアントが独自のログイン基盤（Microsoft Entra ID / Okta / Google Workspace など）を
使う場合は、`backend/auth.py` のトークン検証部分を差し替えます。

- 変更する場所: `backend/auth.py` の `get_current_user`（トークンから本人を特定する処理）
- 変えなくてよい場所: 投稿・削除などの権限チェック（`require_admin`）はそのまま再利用できます。
- 画面側: `src/App.jsx` の `LoginPage` を、クライアントのSSOへのリダイレクトに置き換えます。

アカウント管理画面を自社で作る場合、そのまま使えるAPIが `backend/main.py` にあります。

| やること | API |
| --- | --- |
| 一覧 | `GET /users` |
| 作成 | `POST /users` |
| 権限変更・停止 | `PATCH /users/{user_id}` |
| パスワード再設定 | `POST /users/{user_id}/reset-password` |

いずれも管理者権限が必要で、「有効な管理者が0人になる変更」と
「自分自身の管理者権限を外す操作」は、サーバー側で拒否されます。

必要な確認事項と考え方は [docs/CLIENT_HANDOFF.md](CLIENT_HANDOFF.md) の
「クライアントのSSOへ変更する場合」に詳しくまとめています。

---

## 3. データベースを変える時

- 変更する場所: 環境変数 `DATABASE_URL`（コードは変更しません）
- 対応済みの接続補正: `backend/database.py` の `normalize_database_url`
  （`postgres://` 形式を自動で補正します）

手順とサービスごとの注意（PostgreSQL/Supabase/SQLite等）は
[docs/CLIENT_HANDOFF.md](CLIENT_HANDOFF.md) の「データベースの差し替え」を参照してください。

---

## 4. よくある画面・文言の変更

画面まわりは `src/App.jsx`（表示内容）と `src/App.css`（見た目）が中心です。
文字の基本サイズなど土台の部分だけ `src/index.css` にあります。

| 変えたいもの | ファイル | 目印（探す言葉） |
| --- | --- | --- |
| サービス種別（iPhone / Android など） | `src/App.jsx` | `const serviceOptions = [...]` の配列に追記・削除 |
| 上部の赤い注意書き | `src/App.jsx` | `Header` 関数内の「🚨 根拠確認必須！…」 |
| タイトルの文言（📚誰でも…） | `src/App.jsx` | `Header` と `LoginPage` の `<h1>📚 誰でもロードマップナレッジ</h1>` |
| タイトルの文字サイズ（PC） | `src/index.css` | `h1 { font-size: 56px }`（1024px以下は36px） |
| タイトルの文字サイズ（スマホ）・改行 | `src/App.css` | `h1 { white-space: nowrap }` と `@media (max-width: 640px)` の `h1` |
| 「この情報を使用した」等のボタン文言 | `src/App.jsx` | 各ボタンの文字を直接編集 |
| 使用傾向の絵文字（🔥入電激増 など） | `src/App.jsx` | `getTrendLabel` 関数 |
| ロードマップの色・大きさ | `src/App.jsx` | 末尾の `const nodeStyle = { ... }` |
| ロードマップの分岐の間隔 | `src/App.jsx` | `ROADMAP_NODE_WIDTH` / `ROADMAP_BRANCH_GAP` / `ROADMAP_ROW_HEIGHT` |

### アプリのアイコンを変更する時

タブのアイコンと、ホーム画面・デスクトップに追加した時のアイコンは `public/` にあります。
**元画像を1枚差し替えて、各サイズを作り直す**という手順です。

| ファイル | 用途 | サイズ |
| --- | --- | --- |
| `public/favicon-16.png` / `favicon-32.png` | ブラウザのタブ | 16 / 32 |
| `public/apple-touch-icon.png` | iPhone・iPadのホーム画面 | 180 |
| `public/icon-192.png` / `icon-512.png` | Android・PCへアプリとして追加 | 192 / 512 |
| `public/icon-maskable-512.png` | Androidの丸型など、形に合わせて切り抜かれる時用 | 512 |
| `public/manifest.webmanifest` | アプリ名・テーマ色・使うアイコンの一覧 | - |

新しい元画像（正方形の大きなPNG）を用意し、Macなら以下で一括生成できます。

```bash
cd public
SRC="新しいアイコン.png"
sips -z 16  16  "$SRC" --out favicon-16.png
sips -z 32  32  "$SRC" --out favicon-32.png
sips -z 180 180 "$SRC" --out apple-touch-icon.png
sips -z 192 192 "$SRC" --out icon-192.png
sips -z 512 512 "$SRC" --out icon-512.png
# マスク対応（切り抜かれても欠けないよう80%に縮小し、余白を枠色で埋める）
sips -z 410 410 "$SRC" --out /tmp/inner.png
sips -p 512 512 --padColor 01153E /tmp/inner.png --out icon-maskable-512.png
```

`--padColor` はアイコンの外枠の色です（現在は濃紺 `#01153E`）。
アイコンの雰囲気を変えた時は、`public/manifest.webmanifest` と `index.html` の
`theme-color`（現在 `#0f1117`）も合わせて見直してください。

> 画像を差し替えてもブラウザが古いアイコンを覚えていることがあります。
> 反映されない時は、スーパーリロード（Macは `Cmd + Shift + R`）や
> ホーム画面のアイコンを一度削除して追加し直すと更新されます。

### 補足：スマホでタイトルが改行しない仕組み

2段構えになっています。

1. `src/App.css` の `h1` に `white-space: nowrap`（絶対に改行しない）
2. `src/App.css` の `@media (max-width: 640px)` で
   `font-size: clamp(1.05rem, 5.2vw, 36px)`（画面幅に合わせて自動縮小）

640pxより広い画面では `src/index.css` の元のサイズ（PC 56px / タブレット 36px）を
そのまま使い、**収まらなくなる狭い画面でだけ縮小**します。

タイトルの文字数を増やすと縮小しても収まらなくなるため、
文言を長くする時は `5.2vw` の数値を小さくして調整してください。

### 補足：ロードマップの分岐が重ならない仕組み

`src/App.jsx` の `measureRoadmapWidth` が、各分岐の下にぶら下がる部分の幅を測り、
`RoadmapView` がその幅ぶんだけ左右に広げて配置します。
間隔を広げたい時は `ROADMAP_BRANCH_GAP` の数値を大きくします。

---

## 5. 権限・セキュリティに関わる設定

| 変えたいもの | ファイル | 目印 |
| --- | --- | --- |
| 許可する画面URL（CORS） | 環境変数 `CORS_ORIGINS`（コード不要） | 見本は `backend/.env.example` |
| パスワードの最低文字数 | `backend/schemas.py` | `min_length=12` が**2箇所**（`UserCreate` の新規作成用と `PasswordReset` の再設定用）。両方直さないと片方だけ緩いままになります |
| ログインの有効期限 | 環境変数 `ACCESS_TOKEN_EXPIRE_MINUTES` | 分単位 |
| 権限チェックの内容 | `backend/main.py` | 各APIの `Depends(require_admin)` / `Depends(get_current_user)` |

セキュリティの実装状況と本番前の検討事項は [docs/SECURITY.md](SECURITY.md) を参照してください。

---

## 6. 起動・確認・公開の手順

### ローカルで動かす

**初回だけ、設定ファイル（`.env`）を作る必要があります。**
これを飛ばすとAPIが起動しないので必ず行ってください。

```bash
# --- 1. バックエンド（APIサーバー）---
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 初回だけ：設定ファイルを作る
cp .env.example .env
```

作った `backend/.env` を開き、ローカル確認用に最低限ここだけ書き換えます。

```env
DATABASE_URL=sqlite:///./local_dev.db
DEMO_MODE=true
```

（ローカルではSQLiteという簡易DBを使うので、PostgreSQLの用意は不要です。）

```bash
# 起動
uvicorn main:app --reload --port 8000
```

```bash
# --- 2. フロントエンド（画面）別のターミナルで ---
cd ..            # プロジェクトの一番上へ戻る
npm install

# 初回だけ：設定ファイルを作る
cp .env.example .env

npm run dev      # http://localhost:5173
```

2回目以降は `.env` の作成は不要で、`uvicorn ...` と `npm run dev` の2つだけで起動します。

### 動作確認の順番

1. `http://localhost:8000/health/live` → `{"status":"ok"}`
2. `http://localhost:8000/health/ready` → `{"status":"ready","database":"connected"}`
3. `http://localhost:5173` を開く（デモモードならログインなしで画面が出ます）

### 公開（デプロイ）

- 画面 → Netlify（環境変数 `VITE_API_URL`, `VITE_DEMO_MODE`）
- API → Render（環境変数 `DATABASE_URL`, `CORS_ORIGINS`, `JWT_SECRET_KEY`, `DEMO_MODE` ほか）

障害時の切り分けは [docs/RECOVERY_GUIDE.md](RECOVERY_GUIDE.md) を参照してください。

### 困った時（よくあるエラーと原因）

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| APIが起動せず `DATABASE_URL is not set.` と出る | `backend/.env` を作っていない | 上記手順の `cp .env.example .env` を実行し、`DATABASE_URL` を設定 |
| 画面は出るが「APIに接続できません」と表示される | APIが起動していない、または `VITE_API_URL` が違う | `http://localhost:8000/health/live` が返るか確認 |
| 「`VITE_DEMO_MODE` と `DEMO_MODE` を同じ値に揃えてください」と出る | 画面とAPIでデモ設定が食い違っている | 2つの値を揃えて、両方を再起動 |
| ブラウザのコンソールにCORSエラーが出る | `CORS_ORIGINS` に画面のURLが登録されていない | `backend/.env` の `CORS_ORIGINS` に画面のURLを追加 |
| `.env` を変えたのに反映されない | 起動中のプロセスは古い設定を持ったまま | APIと画面（`npm run dev`）の**両方を再起動**する |
| 公開環境で初回アクセスだけ極端に遅い | 無料プランのRender/Supabaseが休止していた | [docs/RECOVERY_GUIDE.md](RECOVERY_GUIDE.md) を参照 |

---

## 7. 迷った時のファイル早見表

| やりたいこと | 見るファイル |
| --- | --- |
| ログインの有無を切り替える | `.env` / `backend/.env` の `*DEMO_MODE`（本書 1章） |
| アカウント管理の画面を自社で作る | `backend/main.py` の `/users` 系API（本書 2章） |
| 既存アカウント基盤・SSOに繋ぐ | `backend/auth.py` の `get_current_user`（本書 2章、CLIENT_HANDOFF.md） |
| DBを変える | 環境変数 `DATABASE_URL`（本書 3章、CLIENT_HANDOFF.md） |
| 画面の文言・見た目 | `src/App.jsx` / `src/App.css`（本書 4章） |
| 権限・セキュリティ | `backend/` と各環境変数（本書 5章、SECURITY.md） |
| 起動・公開・障害対応 | 本書 6章、RECOVERY_GUIDE.md |
| 起動しない・APIに繋がらない | 本書 6章の「困った時」、RECOVERY_GUIDE.md |

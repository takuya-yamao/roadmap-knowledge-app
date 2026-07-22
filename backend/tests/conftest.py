import os


# 権限まわりの自動テストは「ログインあり」の状態を検証します。
# アプリの初期値はデモモード（認証スキップ）のため、テストでは明示的に無効化します。
# ここは config.py が読み込まれる前に実行される必要があります。
os.environ.setdefault("DEMO_MODE", "false")

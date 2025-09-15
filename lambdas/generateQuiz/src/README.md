# Quiz Generator Local Development Server

このディレクトリには、`generateQuiz` Lambda関数のローカル開発用APIサーバーが含まれています。

## 概要

- **Lambda関数**: `app/lambda_handler.py` - 本番用のLambda関数
- **ローカル開発サーバー**: `src/` - ローカル開発用のFastAPIサーバー
- **共通モジュール**: `src/common/` - Lambda関数とローカルサーバーで共有されるコード

## アーキテクチャ

```
lambdas/generateQuiz/
├── app/                    # Lambda関数
│   ├── lambda_handler.py   # Lambda関数のエントリーポイント
│   └── common/            # 共通モジュール（app用）
├── src/                    # ローカル開発サーバー
│   ├── main.py            # FastAPIサーバー
│   ├── common/            # 共通モジュール（src用）
│   └── requirements.txt   # ローカル開発用の依存関係
└── requirements.txt       # Lambda用の依存関係
```

共通モジュール（`common/`）には以下の機能が含まれています：
- `models.py`: データモデル定義
- `s3_client.py`: S3操作
- `quiz_generator.py`: OpenAIを使用したクイズ生成

## セットアップ

### 1. 環境変数の設定

`.env`ファイルを作成して、以下の環境変数を設定してください：

```bash
# .env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. AWS認証情報の設定

`~/.aws/credentials`ファイルに`escco`プロファイルを設定してください：

```ini
[escco]
aws_access_key_id = your_access_key_here
aws_secret_access_key = your_secret_key_here
region = us-east-1
```

### 3. 依存関係のインストール

```bash
cd src
pip install -r requirements.txt
```

### 4. サーバーの起動

#### 方法1: 直接実行
```bash
cd src
export AWS_PROFILE=escco
python main.py
```

#### 方法2: Docker Compose使用
```bash
# プロジェクトルートから実行
docker-compose up --build
```

## API エンドポイント

### ヘルスチェック
```
GET http://localhost:8000/
```

### クイズ生成（S3からファイルを読み込み）
```
POST http://localhost:8000/generate-quiz
Content-Type: application/json

{
  "bucket": "your-bucket-name",
  "key": "path/to/your/file.md",
  "num_questions": 3
}
```

### クイズ生成（テキストから直接）
```
POST http://localhost:8000/generate-quiz-from-text?num_questions=3
Content-Type: text/plain

ここにMarkdownテキストを入力してください。
```

## 開発時の注意事項

1. **Lambda関数のコードは変更しないでください** - `app/`ディレクトリ内のファイルは本番用です
2. **ローカル開発は`src/`ディレクトリ内で行ってください**
3. **環境変数が正しく設定されていることを確認してください**
4. **AWS認証情報が必要です** - S3からファイルを読み込むため

## テスト

### curlでのテスト例

```bash
# ヘルスチェック
curl http://localhost:8000/

# テキストからクイズ生成
curl -X POST "http://localhost:8000/generate-quiz-from-text?num_questions=2" \
  -H "Content-Type: text/plain" \
  -d "これはテスト用のドキュメントです。クイズを生成してください。"

# S3からクイズ生成
curl -X POST "http://localhost:8000/generate-quiz" \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "your-bucket-name",
    "key": "path/to/file.md",
    "num_questions": 3
  }'
```

## トラブルシューティング

1. **OpenAI API エラー**: `OPENAI_API_KEY`が正しく設定されているか確認
2. **AWS S3 エラー**: `~/.aws/credentials`に`escco`プロファイルが正しく設定されているか確認
3. **ポート競合**: ポート8000が使用中の場合、`main.py`のポート番号を変更
4. **AWS認証エラー**: Dockerコンテナ内でAWS認証情報にアクセスできない場合は、`~/.aws`ディレクトリの権限を確認

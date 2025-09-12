# manage-work-lambda

# フォルダ構成

my-project/
├── docker-compose.yml
├── functions/
│ ├── users/
│ │ ├── src/
│ │ │ └── index.ts ← Lambda ハンドラー
│ │ ├── dist/ ← ビルド成果物（Git 除外）
│ │ ├── package.json
│ │ └── tsconfig.json
│ ├── orders/
│ │ └── ...
│ └── health/
│ └── ...
├── cdk/
│ ├── lib/
│ │ └── api-routing-stack.ts
│ ├── bin/
│ │ └── cdk.ts
│ ├── package.json
│ └── tsconfig.json
├── .gitignore
└── README.md

# local 起動時

1. 起動

   docker-compose build
   docker-compose up

   sam build
   sam local start-api --docker-network workflow-net

2. mysql への接続
   docker exec -it mysql bash
   mysql -uroot -pmmh-test
   use mw_db

3. dynamoDB の初期化
   chmod +x ./local-sql/dynamo-init.sh
   ./local-sql/dynamo-init.sh

   aws dynamodb list-tables --endpoint-url http://localhost:8000

# deploy 時

1. aws sso login --profile {your-profile}

2. 確認
   cdk synth dev/ApiRoutingStack --profile {your-profile}
   cdk diff dev/ApiRoutingStack --profile {your-profile}

3. デプロイ
   cdk deploy dev/ApiRoutingStack --profile {your-profile}

# GitHubActionsRoleStack の deploy

1. デプロイ
   cdk deploy GitHubActionsRoleStack --profile {your-profile}
2. 出力結果を反映
   以下のように出力されるので github の secret に「AWS_ROLE_ARN」という名前で保存
   GitHubActionsRoleStack.RoleArn = arn:aws:iam::260337063361:role/GitHubActionsRoleStack-GitHubActionsRole4F1BBA26-O9hinZIdLx8u

# Cognito の deploy

# Layer の注意

cd layers/common
npm run build

をしないと、修正が反映されない。

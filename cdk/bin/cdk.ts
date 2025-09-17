#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApiRoutingStack } from '../lib/api-routing-stack';
import { S3BucketStack } from '../lib/s3-bucket-stack';
import 'dotenv/config'
import { ApiGenerateQuizAiStack } from '../lib/api-generate-quiz-ai';
import { QuizSrcBucket } from '../lib/quiz-src-bucket';

const stage = process.env.STAGE || 'dev';
const app = new cdk.App();

if(!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.VPC_ID || !process.env.LAMBDA_SG_ID || !process.env.USER_POOL_ID || !process.env.SUBNET_ID){
  throw new Error('Missing required environment variables');
}

const env = {
  account: process.env.AWS_ACCOUNT || '637423381395',
  region: process.env.AWS_REGION || 'us-east-1'
}

// S3BucketStackを独立したスタックとして作成
const s3BucketStack = new S3BucketStack(app, `${stage}-S3BucketStack`, {
  stage,
  env,
});

// QuizSrcBucketを独立したスタックとして作成
const quizSrcBucket = new QuizSrcBucket(app, `${stage}-QuizSrcBucket`, {
  stage,
  env,
});

// ApiRoutingStackを独立したスタックとして作成
const apiRoutingStack = new ApiRoutingStack(app, `${stage}-ApiRoutingStack`, {
  stage,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  VPC_ID: process.env.VPC_ID,
  LAMBDA_SG_ID: process.env.LAMBDA_SG_ID,
  SUBNET_ID: process.env.SUBNET_ID,
  s3Bucket: s3BucketStack.bucket,
  env,
});

// スタック間の依存関係を設定
apiRoutingStack.addDependency(s3BucketStack);

// ApiGenerateQuizAiStackを独立したスタックとして作成
const apiGenerateQuizAiStack = new ApiGenerateQuizAiStack(app, `${stage}-ApiGenerateQuizAiStack`, {
  stage,
  s3Bucket: quizSrcBucket.bucket,
  imageTag: process.env.IMAGE_TAG,
  env
});


import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import path = require('path');
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
const PREFIX = 'quiz-ky';
const REPOSITORY_TOP = path.resolve(__dirname,"../../");

interface ApiRoutingStackProps extends cdk.StackProps {
  stage: string;
  DB_HOST: string;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  VPC_ID: string;
  LAMBDA_SG_ID: string;
  SUBNET_ID:string;
  s3Bucket: s3.Bucket;
}
export class ApiRoutingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiRoutingStackProps) {
    super(scope, id, props);
    // 既存のCognito User Poolを取得
    const userPoolId = process.env.USER_POOL_ID;
    if(!userPoolId){
      throw new Error('USER_POOL_ID is not set');
    }
    const userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', userPoolId);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: props.VPC_ID,
    });
    const lambdaSg = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'LambdaSecurityGroup',
      props.LAMBDA_SG_ID
    );

    // layer
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      layerVersionName: `${PREFIX}-common-layer-${props.stage}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'layers/common')), // nodejs/node_modules/@app/common/… があること
      description: 'Shared utilities (repos, etc.)',
    });

    // S3とRDBにアクセスするLambdaの共通設定
    const commonLambdaSetting = {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      vpc,
      allowPublicSubnet: true,
      securityGroups: [lambdaSg],
      vpcSubnets: { 
        subnets: [
          ec2.Subnet.fromSubnetId(this, 'PublicSubnet1', props.SUBNET_ID), // 明示的にID指定
        ]
      },
      layers: [commonLayer],
      environment: {
        STAGE: props.stage,
        S3_BUCKET: props.s3Bucket.bucketName,
        MYSQL_HOST: props.DB_HOST,
        MYSQL_USER: props.DB_USER,
        MYSQL_PASSWORD: props.DB_PASSWORD,
        MYSQL_DATABASE: props.DB_NAME,
      },
    }

    // lambdas/test を指す
    const getQuizLambda = new lambda.Function(this, 'GetQuizLambda', {
      ...commonLambdaSetting,
      functionName: `${PREFIX}-get-quiz-${props.stage}`,
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'lambdas/getQuiz/dist')),
    });
    
    const createQuizLambda = new lambda.Function(this, 'CreateQuizLambda', {
      ...commonLambdaSetting,
      functionName: `${PREFIX}-create-quiz-${props.stage}`,
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'lambdas/createQuiz/dist')),
    });

    const distributeQuizLambda = new lambda.Function(this, 'DistributeQuizLambda', {
      ...commonLambdaSetting,
      functionName: `${PREFIX}-distribute-quiz-${props.stage}`,
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'lambdas/distributeQuiz/dist')),
    });

    const answerQuizLambda = new lambda.Function(this, 'AnswerQuizLambda', {
      ...commonLambdaSetting,
      functionName: `${PREFIX}-answer-quiz-${props.stage}`,
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'lambdas/answerQuiz/dist')),
    });

    const getSituationLambda = new lambda.Function(this, 'GetSituationLambda', {
      ...commonLambdaSetting,
      functionName: `${PREFIX}-get-situation-${props.stage}`,
      code: lambda.Code.fromAsset(path.join(REPOSITORY_TOP, 'lambdas/getSituation/dist')),
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: `esc-api-authorizer-${props.stage}`,
    });


    const api = new apigateway.RestApi(this, `${PREFIX}-api-${props.stage}`, {
      deployOptions: {
        stageName: props.stage,
      },
    });

    const test = api.root.addResource('getQuiz');
    test.addMethod('POST', new apigateway.LambdaIntegration(getQuizLambda),{
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    test.addMethod('OPTIONS', new apigateway.LambdaIntegration(getQuizLambda))
    const createQuiz = api.root.addResource('createQuiz');
    createQuiz.addMethod('POST', new apigateway.LambdaIntegration(createQuizLambda),{
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    createQuiz.addMethod('OPTIONS', new apigateway.LambdaIntegration(createQuizLambda))

    const distributeQuiz = api.root.addResource('distribute');
    distributeQuiz.addMethod('POST', new apigateway.LambdaIntegration(distributeQuizLambda),{
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    distributeQuiz.addMethod('OPTIONS', new apigateway.LambdaIntegration(distributeQuizLambda))

    const answerQuiz = api.root.addResource('answerQuiz');
    answerQuiz.addMethod('POST', new apigateway.LambdaIntegration(answerQuizLambda),{
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    answerQuiz.addMethod('OPTIONS', new apigateway.LambdaIntegration(answerQuizLambda))
    const getSituation = api.root.addResource('getSituation');
    getSituation.addMethod('GET', new apigateway.LambdaIntegration(getSituationLambda),{
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    getSituation.addMethod('OPTIONS', new apigateway.LambdaIntegration(getSituationLambda))

    props.s3Bucket.grantRead(getQuizLambda);
    props.s3Bucket.grantWrite(createQuizLambda);
    props.s3Bucket.grantRead(distributeQuizLambda);
    props.s3Bucket.grantWrite(distributeQuizLambda);
    props.s3Bucket.grantRead(answerQuizLambda);
    props.s3Bucket.grantRead(getSituationLambda);

    new cdk.CfnOutput(this, `${PREFIX}-api-url-${props.stage}`, {
      value: api.url,
      exportName: `${PREFIX}-api-url-${props.stage}`,
    });
  }
}

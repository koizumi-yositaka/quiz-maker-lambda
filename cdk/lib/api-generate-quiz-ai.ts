import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3"
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';

const REPOSITORY_TOP=path.join(__dirname,"../");
const PREFIX = "quiz-ky-bucket"



export class ApiGenerateQuizAiStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  constructor(scope: Construct, id: string, props: cdk.StackProps & { stage: string; imageTag?: string }) {
    super(scope, id, props);
    const api = new apigateway.RestApi(this, `${PREFIX}-api-${props.stage}`, {
      deployOptions: {
        stageName: props.stage,
      },
    });

    // Pull container image from ECR: 260337063361.dkr.ecr.us-east-1.amazonaws.com/generate-quiz-ai-ecr
    const repository = ecr.Repository.fromRepositoryName(
      this,
      'GenerateQuizEcrRepo',
      'generate-quiz-ai-ecr'
    );

    const imageCode = lambda.DockerImageCode.fromEcr(repository, {
      tagOrDigest: props.imageTag ?? 'latest',
    });

    const generateQuizLambda = new lambda.DockerImageFunction(this, 'GenerateQuizLambda', {
      code: imageCode,
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      functionName: `${PREFIX}-generate-quiz-${props.stage}`,
    });

    const generateQuiz = api.root.addResource('generateQuiz');
    generateQuiz.addMethod('POST', new apigateway.LambdaIntegration(generateQuizLambda),{
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    new cdk.CfnOutput(this, `${PREFIX}-api-url-${props.stage}`, {
      value: api.url,
      exportName: `${PREFIX}-api-url-${props.stage}`,
    });
  }


}
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3"
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';


const REPOSITORY_TOP=path.join(__dirname,"../");
const PREFIX = "quiz-ky-bucket"



export class S3BucketStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  constructor(scope: Construct, id: string, props: cdk.StackProps & { stage: string }) {
    super(scope, id, props);
    const bucket = new s3.Bucket(this,`${PREFIX}-quiz`,{
      bucketName: `${PREFIX}-${props.stage}`,
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publicReadAccess: false
    })
    this.bucket = bucket;
    // bucket.grantPut(resizeLambda)
    // bucket.grantReadWrite(resizeLambda)
  }


}
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';


interface QuizSrcBucketProps extends cdk.StackProps {
  stage: string;
}

const PREFIX = 'quiz-src-bucket-ky';

export class QuizSrcBucket extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  constructor(scope: Construct, id: string, props: QuizSrcBucketProps) {
    super(scope, id, props);
    
    const siteBucket = new s3.Bucket(this,`${PREFIX}-${props.stage}`,{
        bucketName: `${PREFIX}-${props.stage}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
        publicReadAccess: true,
    })
    this.bucket = siteBucket;
    new cdk.CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
    });
  }
}
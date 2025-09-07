import { Handler } from 'aws-lambda';
import { sysConst } from '@app/common/sysConst';
import { ok, wrap } from '@app/common/ifWrapper/http';
import { s3 } from '@app/common/s3';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
export const handler:Handler = wrap(async(event)=>{
    const s3Client = new S3Client({
        region: 'us-east-1'
    });
    const command = new PutObjectCommand(
        { Bucket: "test-bucket-esc-ky", Key: "test-key", Body: "test-body"}
    );
    const getCommand = new GetObjectCommand(
        { Bucket: "test-bucket-esc-ky", Key: "test-key" }
    );
    const getResponse = await s3.getObject(s3Client, "test-bucket-esc-ky", "test-key");
    const content = await getResponse?.transformToString();
    console.log('response', content);
    return ok({ message: 'Hello from Lambda' });
});
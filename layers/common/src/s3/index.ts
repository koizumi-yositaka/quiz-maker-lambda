import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

export const s3 = {
    getObject: async (s3Client: S3Client, bucket: string, key: string) => {

        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await s3Client.send(command);
        return response.Body;
    },
    putObject: async (s3Client: S3Client, bucket: string, key: string, body: string) => {
        const command = new PutObjectCommand({ Bucket: bucket, Key: key, Body: body });
        const response = await s3Client.send(command);
        return response;
    },
    isExist: async (s3Client: S3Client, bucket: string, key: string) => {
        const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
        const response = await s3Client.send(command);
        return !!response.ContentLength;
    }
}
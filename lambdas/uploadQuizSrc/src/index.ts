import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { PutObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import Busboy from 'busboy';
import { PutObjectCommand } from '@aws-sdk/client-s3';
const s3Client = new S3Client({
    region: 'us-east-1'
});

// 全オリジン許可のCORSヘッダー
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'false' 
};
export const handler:Handler = async (event) => {
    return new Promise((resolve, reject) => {
      try {
        // OPTIONSリクエスト（プリフライト）の処理
        if (event.httpMethod === 'OPTIONS') {
          console.log("Handling OPTIONS request");
          resolve({
            statusCode: 200,
            headers: corsHeaders,
            body: ''
          });
          return;
        }
        const bucketName = process.env.S3_BUCKET
        if (!bucketName) {
          console.error('Missing S3 bucket name. Set BUCKET_NAME or S3_BUCKET');
          resolve({
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing S3 bucket name. Set BUCKET_NAME or S3_BUCKET' }),
          });
          return;
        }
        const key = `uploads/${Date.now()}.md`;
  
        const busboy = Busboy({
          headers: {
            "content-type": event.headers["content-type"] || event.headers["Content-Type"],
          },
        });
  
        let uploadPromise:Promise<PutObjectCommandOutput>;
  
        busboy.on("file", (fieldname: string, file: any, infoOrFilename: any, encoding?: string, mimetype?: string) => {
          // Support both Busboy v0.x and v1.x signatures
          let filename: string | undefined;
          let contentType: string | undefined;
          if (infoOrFilename && typeof infoOrFilename === 'object') {
            filename = infoOrFilename.filename;
            contentType = (infoOrFilename.mimeType || infoOrFilename.mimetype) as string | undefined;
          } else {
            filename = infoOrFilename as string | undefined;
            contentType = mimetype;
          }
          console.log(`Uploading file: ${filename}`);

          const chunks: Buffer[] = [];
          file.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });
          file.on('error', (err: unknown) => {
            console.error('Stream error:', err);
          });
          file.on('end', () => {
            const bodyBuffer = Buffer.concat(chunks);
            uploadPromise = s3Client.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: bodyBuffer,
                ContentType: contentType || "text/markdown",
                ContentLength: bodyBuffer.length,
              })
            );
          });
        });
  
        busboy.on("finish", async () => {
          if (uploadPromise) {
            await uploadPromise;
            resolve({
              statusCode: 200,
              headers: corsHeaders,
              body: JSON.stringify({
                message: `File uploaded successfully`,
                key: key,
              }),
            });
          } else {
            reject({
              statusCode: 400,
              headers: corsHeaders,
              body: JSON.stringify({ error: "No file received" }),
            });
          }
        });
  
        busboy.end(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
      } catch (err) {
        console.error(err);
        reject({
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "File upload failed" }),
        });
      }
    });
  };
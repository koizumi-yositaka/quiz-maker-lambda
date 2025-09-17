import { Handler } from 'aws-lambda';
import { sysConst } from '@app/common/sysConst';
import { ok, wrap } from '@app/common/ifWrapper/http';
import { badRequest } from '@app/common/errors';
import { s3 } from '@app/common/s3';
import { isHttpError, internal } from '@app/common/errors';
import { S3Client } from '@aws-sdk/client-s3';
import { TPageDesign } from '@app/common/types';
import mysql from 'mysql2/promise';

type RequestBody = {
    userId: string;
    quizName: string;
    pageDesign: TPageDesign[];
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'false' 
  };
export const handler:Handler = wrap(async(event)=>{
    let conn;
    try{
        if(!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD || !process.env.MYSQL_DATABASE){
            throw internal("Missing required environment variables");
        }
        conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        const body: RequestBody = JSON.parse(event.body || "{}");
        const quizBucket = process.env.S3_BUCKET ?? '';
        if (quizBucket === '') {    
            throw internal('S3_BUCKET environment variable is not set');
        }
        const s3Client = new S3Client({
            region: 'us-east-1'
        });
        const quiz_id = `${body.userId}_${body.quizName}`;
        const s3Key = `${quiz_id}.json`;

        console.log(`Creating quiz with ID: ${quiz_id}`);
        console.log(`S3 Bucket: ${quizBucket}`);
        console.log(`S3 Key: ${s3Key}`);

        // Upload to S3
        try {
            console.log('Uploading to S3...');
            await s3.putObject(s3Client, quizBucket, s3Key, JSON.stringify(body.pageDesign));
            console.log('Successfully uploaded to S3');
        } catch (s3Error) {
            console.error('S3 upload failed:', s3Error);
            throw internal('Failed to upload quiz data to S3', s3Error);
        }

        // Insert into database
        try {
            console.log('Inserting into database...');
            await conn.query('INSERT INTO t_quiz (quiz_id, author_id) VALUES (?, ?)', [quiz_id, body.userId]);
            console.log('Successfully inserted into database');
        } catch (dbError) {
            console.error('Database insert failed:', dbError);
            throw internal('Failed to save quiz to database', dbError);
        }

        return ok({ fileKey: quiz_id }, corsHeaders);
    } finally {
        if(conn){
            await conn.end();
        }
    }
});
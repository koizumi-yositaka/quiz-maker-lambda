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
    userId: number;
    quizName: string;
    pageDesign: TPageDesign[];
}

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
            throw badRequest('S3_BUCKET is not set');
        }
        const s3Client = new S3Client({
            region: 'us-east-1'
        });
        const quiz_id = `${body.userId}_${body.quizName}`;

        await s3.putObject(s3Client, quizBucket, `${quiz_id}.json`, JSON.stringify(body.pageDesign));
        await conn.query('INSERT INTO t_quiz (quiz_id, author_id) VALUES (?, ?)', [quiz_id,body.userId]);

        return ok({ fileKey: `${quiz_id}` });
    } catch (err) {
        if(isHttpError(err)){
            throw err;
        }else{
            console.error("Error creating quiz:", err);
            throw internal("Internal Server Error", err);
        }
    } finally {
        if(conn){
            await conn.end();
        }
    }
});
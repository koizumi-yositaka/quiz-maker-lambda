import { Handler } from 'aws-lambda';
import { ok, wrap } from '@app/common/ifWrapper/http';
import { badRequest, notFound } from '@app/common/errors';
import { s3 } from '@app/common/s3';
import { isHttpError, internal } from '@app/common/errors';
import { S3Client } from '@aws-sdk/client-s3';
import mysql from 'mysql2/promise';
import { ses } from '@app/common/ses';

type RequestBody = {
    quizId: string;
    targets: string[];
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

        if(!await s3.isExist(s3Client, quizBucket, `${body.quizId}.json`)){
            throw notFound('Quiz not found');
        }
        // 既存のemailを取得
        const [quizDistribution] = await conn.query('select email from t_quiz_distribution where quiz_id = ?', [body.quizId]);
        const emails = quizDistribution as any[] as string[];


        console.log("targets",body.targets);
        // for(const email of body.targets){
        //     await ses.sendEmail([email], 'Quiz Distributed', `http://localhost:5500/login?preQuizId=${body.quizId}&preEmail=${email}`);
        // }


        const newEmails = body.targets.filter((email) => !emails.includes(email));
        const values = newEmails.map(email => [body.quizId, email]);
        // 新しいemailを追加
        await conn.query('insert into t_quiz_distribution (quiz_id, email) values ?', [values]);

        return ok({ fileKey: `${body.quizId}`,newEmails:newEmails });
    } finally {
        if(conn){
            await conn.end();
        }
    }
});
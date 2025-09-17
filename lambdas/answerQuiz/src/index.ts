import { Handler } from 'aws-lambda';
import { sysConst } from '@app/common/sysConst';
import { ok, wrap } from '@app/common/ifWrapper/http';
import { badRequest } from '@app/common/errors';
import { s3 } from '@app/common/s3';
import { isHttpError, internal } from '@app/common/errors';
import { S3Client } from '@aws-sdk/client-s3';
import { TPageDesign } from '@app/common/types';
import mysql from 'mysql2/promise';
import { ses } from '@app/common/ses';

type RequestBody = {
    answeredUserId: string;
    quizId: string;
    answer: Record<string, string>;
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
        console.log("MYSQL_HOST", process.env.MYSQL_HOST);
        console.log("MYSQL_USER", process.env.MYSQL_USER);
        console.log("MYSQL_PASSWORD", process.env.MYSQL_PASSWORD);
        console.log("MYSQL_DATABASE", process.env.MYSQL_DATABASE);
        conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        const body: RequestBody = JSON.parse(event.body || "{}");
        const {quizId, answer,answeredUserId} = body;
        const quizBucket = process.env.S3_BUCKET ?? '';
        if (quizBucket === '') {    
            throw badRequest('S3_BUCKET is not set', corsHeaders);
        }
        const s3Client = new S3Client({
            region: 'us-east-1'
        });

        
        const getResponse = await s3.getObject(s3Client, quizBucket, `${quizId}.json`);
        if(!getResponse){
            throw badRequest('Quiz not found');
        }
        const content = await getResponse?.transformToString();
        const pageDesign = JSON.parse(content || '[]') as TPageDesign[];
        let answerMap:Record<string, string> = {};
        let totalQ = 0;
        let score = 0;
        pageDesign.forEach((page)=>{
            page.components.forEach((component)=>{
                answerMap[component.id] = component.answer;
                totalQ++;
            });
        });

        const result:Record<string, string> = {};
        for(const key in answer){
            const a = answerMap[key];
            if(!a){
                result[key] = 'No Answer';
                continue;
            }
            if(a === answer[key]){
                result[key] = 'correct';
                score++;
            }else{
                result[key] = 'incorrect';
            }
        }


        const [rows] = await conn.query('select COALESCE(MAX(version), 0) as max_version from t_quiz_response where quiz_id = ? and respondent_email = ?', [body.quizId, body.answeredUserId]);
        console.log("rows", rows);
        // rows はオブジェクト配列になる
        const maxVersion = (rows as any)[0].max_version as number;
        const newVersion = maxVersion + 1;
        console.log("newVersion", newVersion);

        //ses.sendEmail([body.answeredUserId], 'Quiz Answer', `Quiz Answer version ${newVersion}: ${score}/${totalQ}`);
        // 回答を保存
        await conn.query('insert into t_quiz_response (quiz_id, respondent_email, version, score) values (?, ?, ?, ?)', [body.quizId, body.answeredUserId, newVersion, score]);

        return ok({result, score, totalQ}, corsHeaders);
    } finally {
        if(conn){
            await conn.end();
        }
    }
});
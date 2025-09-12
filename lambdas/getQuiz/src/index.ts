import { Handler } from 'aws-lambda';

import { ok, wrap } from '@app/common/ifWrapper/http';
import { badRequest, notFound } from '@app/common/errors';
import { s3 } from '@app/common/s3';
import { isHttpError, internal } from '@app/common/errors';
import { S3Client } from '@aws-sdk/client-s3';
import { TPageDesign } from '@app/common/types';
import mysql from 'mysql2/promise';

type RequestBody = {
    quizId: string;
    email: string;
    password: string;
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
        const {quizId, email} = body;
        console.log("quizId",quizId)
        console.log("email",email)
        const quizBucket = process.env.S3_BUCKET ?? '';
        if (quizBucket === '') {    
            throw badRequest('S3_BUCKET is not set');
        }
        const s3Client = new S3Client({
            region: 'us-east-1'
        });
        const [quizInfo] = await conn.query('select allow_multiple_answers from t_quiz where quiz_id = ?', [body.quizId]);
        const [rows] = await conn.query('select COALESCE(MAX(version), 0) as max_version from t_quiz_response where quiz_id = ? and respondent_email = ?', [body.quizId, body.email]);
        if((rows as any[]).length === 0 || (quizInfo as any[]).length === 0){
            throw notFound('クイズデータがありません');
        }
        
        
        const allowMultipleAnswers = (quizInfo as any[])[0].allow_multiple_answers as boolean;


        console.log("rows", rows);
        // rows はオブジェクト配列になる
        const maxVersion = (rows as any)[0].max_version as number;

        // 複数回答が許可されていないかつ、既に回答済みの場合はエラーを返す
        if(!allowMultipleAnswers && maxVersion > 0){
            throw badRequest('既に回答済みです');
        }
        const [quizDistribution] = await conn.query('SELECT * FROM t_quiz_distribution WHERE quiz_id = ? AND email = ?', [quizId, email]);
        // 配信がない場合はエラーを返す
        if((quizDistribution as any[]).length === 0){
            throw notFound('クイズの配信がありません');
        }
        // クイズが見つからない場合はエラーを返す
        if(!await s3.isExist(s3Client, quizBucket, `${quizId}.json`)){
            throw notFound('クイズが見つかりません');
        }

        const getResponse = await s3.getObject(s3Client, quizBucket, `${quizId}.json`);

        const content = await getResponse?.transformToString();
        const pageDesign = JSON.parse(content || '[]') as TPageDesign[];
        pageDesign.forEach((page)=>{
            page.components.forEach((component)=>{
                component.answer = '';
            });
        });

        return ok({pageDesign:pageDesign});

    } finally {
        if(conn){
            await conn.end();
        }
    }
});
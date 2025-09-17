import { Handler } from 'aws-lambda';

import { ok, wrap } from '@app/common/ifWrapper/http';
import { badRequest, notFound, unauthorized } from '@app/common/errors';
import { s3 } from '@app/common/s3';
import { isHttpError, internal } from '@app/common/errors';
import { S3Client } from '@aws-sdk/client-s3';
import { TPageDesign } from '@app/common/types';
import mysql from 'mysql2/promise';


type QuizSituation = {
    quizId: string;
    quizName: string;
    authorId: string;
    quizCreatedAt: string;
    quizResponseSituations: QuizResponseSituation[];
}

type QuizResponseSituation = {
    respondentEmail: string;
    version: number;
    score: number;
    responseCreatedAt: string;
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

        // OPTIONSリクエスト（プリフライト）の処理
        if (event.httpMethod === 'OPTIONS') {
            console.log("Handling OPTIONS request");
            return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
            };
        }
        if(!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD || !process.env.MYSQL_DATABASE){
            throw internal("Missing required environment variables");
        }
        conn = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });
        let authorizer = event.requestContext?.authorizer;
        console.log("authorizer", authorizer);
        console.log("process.env.IS_LOCAL", process.env.IS_LOCAL);
        if(process.env.IS_LOCAL){
            authorizer = {
                claims: {
                    'cognito:username': '74982488-80d1-7066-4995-3e9e6166da60'
                }
            }
        }
        if (!authorizer) {
          console.error("No authorizer found");
          throw unauthorized("Unauthorized");
        }
    
        // Cognito認証の場合、ユーザー情報はauthorizer.claimsに含まれる
        const claims = authorizer.claims || authorizer;
        const username = claims['cognito:username'];
        const email = event.pathParameters?.email || '';
        const quizId = event.pathParameters?.quizId || '';
        let sql = `
        SELECT 
            q.quiz_id as quizId,
            qr.respondent_email as respondentEmail,
            qr.version as version,
            qr.score as score,
            qr.created_at as responseCreatedAt,
            q.author_id as authorId,
            q.created_at as quizCreatedAt
        FROM t_quiz q
        LEFT JOIN t_quiz_response qr ON q.quiz_id = qr.quiz_id
        WHERE q.author_id = ?;
        `;
        const params: string[] = [];
        params.push(username);

        if (quizId) {
            sql += ' AND quiz_id = ?';
            params.push(quizId);
        }

        if (email) {
            sql += ' AND respondent_email = ?';
            params.push(email);
        }

        const [rows] = await conn.query(sql, params);
        console.log("rows", rows);
        // SQLの結果をQuizSituation型に変換
        const quizMap = new Map<string, QuizSituation>();
        
        for (const row of rows as any[]) {
            const quizId = row.quizId;
            
            if (!quizMap.has(quizId)) {
                quizMap.set(quizId, {
                    quizId: row.quizId,
                    quizName: row.quizId.split('_')[1],
                    authorId: row.authorId,
                    quizCreatedAt: row.quizCreatedAt,
                    quizResponseSituations: []
                });
            }
            
            // 回答がある場合のみ追加
            if (row.respondentEmail) {
                const quiz = quizMap.get(quizId)!;
                quiz.quizResponseSituations.push({
                    respondentEmail: row.respondentEmail,
                    version: row.version,
                    score: row.score,
                    responseCreatedAt: row.responseCreatedAt
                });
            }
        }

        const result = Array.from(quizMap.values());

        return ok({result}, corsHeaders);
    } finally {
        if(conn){
            await conn.end();
        }
    }
});
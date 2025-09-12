import { Handler } from 'aws-lambda';

import { ok, wrap } from '@app/common/ifWrapper/http';
import { badRequest, notFound } from '@app/common/errors';
import { s3 } from '@app/common/s3';
import { isHttpError, internal } from '@app/common/errors';
import { S3Client } from '@aws-sdk/client-s3';
import { TPageDesign } from '@app/common/types';
import mysql from 'mysql2/promise';


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
        const email = event.pathParameters?.email || '';
        const quizId = event.pathParameters?.quizId || '';

        let sql = 'SELECT * FROM t_quiz_response WHERE 1=1';
        const params: string[] = [];

        if (quizId) {
        sql += ' AND quiz_id = ?';
        params.push(quizId);
        }

        if (email) {
        sql += ' AND respondent_email = ?';
        params.push(email);
        }

        const [rows] = await conn.query(sql, params);


        return ok({rows:rows});
    } finally {
        if(conn){
            await conn.end();
        }
    }
});
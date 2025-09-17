import os
import json
from common.s3_client import load_md_from_s3
from common.quiz_generator import generate_quiz

# ==== Lambda Handler (API Gateway) ====
def lambda_handler(event, context):
    try:
        # OPTIONSリクエスト（プリフライト）の処理
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"message": "OPTIONS request received"})
            }

        raw_body = event.get("body")
        if raw_body is None:
            qs = event.get("queryStringParameters") or {}
            body = {"key": qs.get("key"), "num_questions": qs.get("num_questions")}
        else:
            body = json.loads(raw_body or "{}")

        bucket = os.environ.get("S3_BUCKET")
        key = (body or {}).get("key")

        nq_raw = (body or {}).get("num_questions")
        try:
            num_questions = int(nq_raw) if nq_raw not in (None, "", []) else 3
        except Exception:
            num_questions = 3

        if not bucket:
            print("Missing S3_BUCKET env var")
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "S3_BUCKET is not set"})
            }

        if not key:
            print("Missing 'key' in request body or query")
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "'key' is required in body or query"})
            }

        print(f"Loading document from s3://{bucket}/{key} with {num_questions} questions")
        text = load_md_from_s3(bucket, key)
        quiz = generate_quiz(text, num_questions=num_questions)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps([q.dict() for q in quiz], ensure_ascii=False)
        }

    except Exception as e:
        print("Error while generating quiz:", str(e))
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)})
        }
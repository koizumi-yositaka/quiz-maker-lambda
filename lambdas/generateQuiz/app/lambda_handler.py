import os
import json
from common.s3_client import load_md_from_s3
from common.quiz_generator import generate_quiz

# ==== Lambda Handler (API Gateway) ====
def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        bucket = os.environ.get("S3_BUCKET")
        key = body.get("key")
        num_questions = int(body.get("num_questions", 3))
        if not bucket or not key:
            raise Exception("S3_BUCKET and key are required")
        text = load_md_from_s3(bucket, key)
        quiz = generate_quiz(text, num_questions=num_questions)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps([q.dict() for q in quiz], ensure_ascii=False)
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
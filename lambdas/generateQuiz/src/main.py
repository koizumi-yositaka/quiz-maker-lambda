import os
import json
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
from common.models import TPageDesign
from common.s3_client import load_md_from_s3
from common.quiz_generator import generate_quiz

# ==== リクエストボディ ====

class GenerateQuizRequest(BaseModel):
    key: str
    num_questions: int = 3

class GenerateFromTextRequest(BaseModel):
    text: str
    num_questions: int = 3

# ==== FastAPI アプリケーション ====
app = FastAPI(
    title="Quiz Generator API",
    description="Local development server for quiz generation",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==== ヘルパー関数 ====
def load_md_from_s3_with_error_handling(bucket_name: str, key: str) -> str:
    """S3からMarkdownファイルを読み込む（エラーハンドリング付き、esccoプロファイル使用）"""
    try:
        return load_md_from_s3(bucket_name, key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"S3からファイルを読み込めませんでした: {str(e)}")

def generate_quiz_with_error_handling(document_text: str, num_questions: int = 3) -> List[TPageDesign]:
    """OpenAIを使用してクイズを生成する（エラーハンドリング付き）"""
    try:
        return generate_quiz(document_text, num_questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"クイズ生成に失敗しました: {str(e)}")

# ==== API エンドポイント ====
@app.get("/")
async def root():
    """ヘルスチェック"""
    return {"message": "Quiz Generator API is running"}

@app.post("/generate-quiz")
async def generate_quiz_endpoint(request: GenerateQuizRequest):
    """クイズ生成エンドポイント"""
    try:
        # S3からドキュメントを読み込み
        text = load_md_from_s3_with_error_handling(os.environ.get("S3_BUCKET"), request.key)
        
        # クイズを生成
        quiz = generate_quiz_with_error_handling(text, num_questions=request.num_questions)
        
        return [q.dict() for q in quiz]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"予期しないエラーが発生しました: {str(e)}")

@app.post("/generate-quiz-from-text")
async def generate_quiz_from_text(request: GenerateFromTextRequest):
    """テキストから直接クイズを生成するエンドポイント（テスト用）"""
    try:
        text = request.text
        num_questions = request.num_questions
        
        if not text:
            raise HTTPException(status_code=400, detail="textパラメータが必要です")
        
        quiz = generate_quiz_with_error_handling(text, num_questions=num_questions)
        return [q.dict() for q in quiz]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"予期しないエラーが発生しました: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

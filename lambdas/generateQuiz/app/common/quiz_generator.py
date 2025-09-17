import os
import json
from typing import List, Dict, Any
from pydantic import RootModel
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from langchain_core.output_parsers import PydanticOutputParser
from .models import TPageDesign


class QuizPages(RootModel[List[TPageDesign]]):
    pass


def _prepare_inputs(inputs: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "num_questions": inputs.get("num_questions", 3),
        "document_text": inputs.get("document_text", "")
    }


def generate_quiz(document_text: str, num_questions: int = 3, openai_api_key: str = None) -> List[TPageDesign]:
    """LangChain + ChatOpenAI でクイズを生成する"""
    try:
        load_dotenv()
        api_key = openai_api_key or os.getenv("OPEN_API_KEY")
        if not api_key:
            raise Exception("OpenAI APIキーが設定されていません")

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, openai_api_key=api_key)

        system_tmpl = (
            "あなたは教育用クイズ生成AIです。\n"
            "以下の制約を守って出力してください:\n\n"
            "- 出力は 必ず JSON のみ\n"
            "- 各ページには {num_questions} 問を含めること\n"
            "- 各質問は \"radio\" 形式で4つ以上の選択肢を持つこと\n"
            "- label は日本語, value は英語キー\n"
            "- requiredMessage は必ず \"\"（空文字）\n"
            "- answer には正解の value を入れること\n"
            "- pageId は \"page1\", \"page2\", ... とすること\n"
            "- 各ページは以下の構造で出力してください:\n"
            "  {{\n"
            "    \"pageId\": \"page1\",\n"
            "    \"components\": [\n"
            "      {{\n"
            "        \"id\": \"q1\",\n"
            "        \"type\": \"radio\",\n"
            "        \"content\": {{\n"
            "          \"q\": \"質問文\",\n"
            "          \"qIndex\": 1,\n"
            "          \"name\": \"question1\",\n"
            "          \"options\": [{{\"label\": \"選択肢1\", \"value\": \"option1\"}}],\n"
            "          \"requiredMessage\": \"\"\n"
            "        }},\n"
            "        \"answer\": \"正解のvalue\"\n"
            "      }}\n"
            "    ]\n"
            "  }}\n"
            "- 最終出力は配列(JSON array)で、各要素はページオブジェクト\n"
        )

        user_tmpl = "Document:\n{document_text}"

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_tmpl),
            ("user", user_tmpl),
        ])

        parser = PydanticOutputParser(pydantic_object=QuizPages)

        chain = (
            RunnableLambda(_prepare_inputs)
            | prompt
            | llm
            | parser
        )

        pages: QuizPages = chain.invoke({
            "document_text": document_text,
            "num_questions": num_questions,
        })
        return list(pages.root)

    except Exception as e:
        raise Exception(f"クイズ生成に失敗しました: {str(e)}")

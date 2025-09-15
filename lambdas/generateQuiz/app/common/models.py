from typing import List
from pydantic import BaseModel, Field

# ==== 型定義 ====
class TRadioOption(BaseModel):
    label: str = Field(..., description="選択肢の表示ラベル（日本語）")
    value: str = Field(..., description="選択肢の内部値（英語）")

class TInputContentDesign(BaseModel):
    q: str
    qIndex: int
    name: str
    options: List[TRadioOption]
    requiredMessage: str = ""

class TInputComponentDesign(BaseModel):
    id: str
    type: str = "radio"
    content: TInputContentDesign
    answer: str

class TPageDesign(BaseModel):
    pageId: str
    components: List[TInputComponentDesign]

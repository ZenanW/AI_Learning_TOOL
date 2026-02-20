import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

router = APIRouter()


class ExpandRequest(BaseModel):
    topic: str


class ExpandResponse(BaseModel):
    subtopic: str


@router.post("/expand", response_model=ExpandResponse)
async def expand_topic(req: ExpandRequest):
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured",
        )

    client = AsyncOpenAI(api_key=api_key)

    completion = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a learning assistant. Given a topic, respond with "
                    "exactly one concise subtopic that a learner should study next. "
                    "Reply with only the subtopic name, nothing else."
                ),
            },
            {
                "role": "user",
                "content": f"What should I learn next after: {req.topic}",
            },
        ],
        max_tokens=50,
        temperature=0.7,
    )

    subtopic = (completion.choices[0].message.content or "").strip()

    if not subtopic:
        raise HTTPException(
            status_code=500,
            detail="AI returned an empty response",
        )

    return ExpandResponse(subtopic=subtopic)

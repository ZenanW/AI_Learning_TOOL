import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

router = APIRouter()


class ExpandRequest(BaseModel):
    topic: str


class ExpandResponse(BaseModel):
    subtopic: str
    description: str


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
                    "exactly one concise subtopic that a learner should study next, "
                    "along with a 2-3 sentence description of what it covers and why "
                    "it matters.\n\n"
                    "Respond with ONLY valid JSON in this format:\n"
                    '{"subtopic": "Topic Name", "description": "2-3 sentence explanation."}\n\n'
                    "No markdown, no code fences, just raw JSON."
                ),
            },
            {
                "role": "user",
                "content": f"What should I learn next after: {req.topic}",
            },
        ],
        max_tokens=200,
        temperature=0.7,
    )

    raw = (completion.choices[0].message.content or "").strip()

    # Strip markdown code fences if the model includes them
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[: -3].rstrip()

    try:
        import json
        data = json.loads(raw)
        subtopic = data.get("subtopic", "").strip()
        description = data.get("description", "").strip()
    except (json.JSONDecodeError, AttributeError):
        # Fallback: treat the whole response as a subtopic name
        subtopic = raw
        description = ""

    if not subtopic:
        raise HTTPException(
            status_code=500,
            detail="AI returned an empty response",
        )

    return ExpandResponse(subtopic=subtopic, description=description)

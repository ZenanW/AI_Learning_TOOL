import json
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

router = APIRouter()


class ContentRequest(BaseModel):
    topic: str
    context: str = ""  # optional: parent topic or learning path context


class ContentResponse(BaseModel):
    summary: str
    key_concepts: list[str]
    explanation: str
    practice_question: str
    further_reading: str


@router.post("/generate-content", response_model=ContentResponse)
async def generate_content(req: ContentRequest):
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured",
        )

    client = AsyncOpenAI(api_key=api_key)

    context_hint = ""
    if req.context:
        context_hint = f" The learner is studying this as part of a path on '{req.context}'."

    completion = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert tutor. Given a topic, generate a concise mini-lesson "
                    "that helps a learner understand it quickly.\n\n"
                    "Respond with ONLY valid JSON in this exact format:\n"
                    "{\n"
                    '  "summary": "A 1-2 sentence overview of the topic.",\n'
                    '  "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],\n'
                    '  "explanation": "A clear 3-5 sentence explanation covering the core ideas. '
                    'Use simple language. Include a concrete example if helpful.",\n'
                    '  "practice_question": "A thought-provoking question the learner can try to answer '
                    'to test their understanding.",\n'
                    '  "further_reading": "A brief suggestion of what to explore next or a recommended '
                    'resource type (e.g. textbook chapter, tutorial, documentation)."\n'
                    "}\n\n"
                    "Keep everything concise and beginner-friendly. "
                    "No markdown, no code fences, just raw JSON."
                ),
            },
            {
                "role": "user",
                "content": f"Create a mini-lesson for: {req.topic}{context_hint}",
            },
        ],
        max_tokens=600,
        temperature=0.7,
    )

    raw = (completion.choices[0].message.content or "").strip()

    # Strip markdown code fences if the model includes them
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3].rstrip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON: {raw[:200]}",
        )

    return ContentResponse(
        summary=data.get("summary", ""),
        key_concepts=data.get("key_concepts", []),
        explanation=data.get("explanation", ""),
        practice_question=data.get("practice_question", ""),
        further_reading=data.get("further_reading", ""),
    )

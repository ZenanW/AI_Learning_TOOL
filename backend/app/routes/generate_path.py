import json
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

router = APIRouter()


class GeneratePathRequest(BaseModel):
    topic: str


class PathNode(BaseModel):
    id: str
    label: str
    description: str


class PathEdge(BaseModel):
    source: str
    target: str


class GeneratePathResponse(BaseModel):
    nodes: list[PathNode]
    edges: list[PathEdge]


@router.post("/generate-path", response_model=GeneratePathResponse)
async def generate_path(req: GeneratePathRequest):
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
                    "You are a learning path designer. Given a topic, create a structured "
                    "learning path with 4-5 nodes. Each node is a subtopic the learner should "
                    "study, ordered from foundational to advanced.\n\n"
                    "Respond with ONLY valid JSON in this exact format:\n"
                    "{\n"
                    '  "nodes": [\n'
                    '    {"id": "1", "label": "Topic Name", "description": "2-3 sentence explanation of what to learn and why."},\n'
                    "    ...\n"
                    "  ],\n"
                    '  "edges": [\n'
                    '    {"source": "1", "target": "2"},\n'
                    "    ...\n"
                    "  ]\n"
                    "}\n\n"
                    "The first node should be the main topic itself. "
                    "Edges should connect prerequisites to their next steps. "
                    "Keep labels concise (2-4 words). "
                    "No markdown, no code fences, just raw JSON."
                ),
            },
            {
                "role": "user",
                "content": f"Create a learning path for: {req.topic}",
            },
        ],
        max_tokens=800,
        temperature=0.7,
    )

    raw = (completion.choices[0].message.content or "").strip()

    # Strip markdown code fences if the model includes them
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[: -3].rstrip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON: {raw[:200]}",
        )

    nodes = [PathNode(**n) for n in data.get("nodes", [])]
    edges = [PathEdge(**e) for e in data.get("edges", [])]

    if not nodes:
        raise HTTPException(
            status_code=500,
            detail="AI returned an empty learning path",
        )

    return GeneratePathResponse(nodes=nodes, edges=edges)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes.expand import router as expand_router
from app.routes.generate_path import router as generate_path_router

load_dotenv()

app = FastAPI(title="AI Learning Helper API")

# Allow the Next.js frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(expand_router, prefix="/api")
app.include_router(generate_path_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}

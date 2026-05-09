from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain_ollama import ChatOllama
from rag_pipeline import get_vector_db, ask_question


# ── Preload Vector DB once at server startup ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting up — loading Vector DB...")
    get_vector_db()
    print("✅ Ready to serve requests.")
    yield
    print("🛑 Shutting down.")


app = FastAPI(lifespan=lifespan)

# ── CORS — allow frontend to talk to backend ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load LLM once ──
llm = ChatOllama(model="phi3")  # swap to "llama3" for better answers


class Question(BaseModel):
    query: str


@app.get("/")
def home():
    return {"message": "KIIT RAG Chatbot API is running 🚀"}


@app.post("/chat")
def chat(q: Question):
    if not q.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    try:
        answer = ask_question(q.query, llm)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ==============================
# RAG PIPELINE (FINAL)
# ==============================

import os
import csv
import pdfplumber
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# ── Cached at module level — loaded once only ──
_embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)
_db = None


# ─────────────────────────────────────────────
# 1. PDF LOADER — extracts text + tables
# ─────────────────────────────────────────────
def load_pdf_with_tables(path: str) -> list[Document]:
    docs = []
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""

            # Extract tables and append as readable pipe-separated rows
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    cells = [cell.strip() for cell in row if cell and cell.strip()]
                    if cells:
                        text += "\n" + " | ".join(cells)

            text = text.strip()
            if text:
                docs.append(Document(
                    page_content=text,
                    metadata={"source": "rulebook", "page": i + 1}
                ))

    print(f"📄 Loaded {len(docs)} pages from PDF.")
    return docs


# ─────────────────────────────────────────────
# 2. CSV LOADER — each bullet = one document
#    Prevents unrelated facts mixing together
# ─────────────────────────────────────────────
def load_csv(path: str) -> list[Document]:
    docs = []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            content = row.get('content', '').strip()
            topic   = row.get('topic', '').strip()
            category= row.get('category', '').strip()
            if not content:
                continue

            # Split each bullet point into its own standalone document
            # This stops the LLM from mixing unrelated facts (e.g. laptop fee + hostel fee)
            lines = [l.strip() for l in content.split('\n') if l.strip().startswith('-')]

            if lines:
                for line in lines:
                    fact = line.lstrip('- ').strip().rstrip('.')
                    if len(fact) > 30:
                        # Prefix with topic so context is always clear
                        doc_text = f"{topic.replace('_', ' ').title()}: {fact}."
                        docs.append(Document(
                            page_content=doc_text,
                            metadata={
                                "source": "csv_dataset",
                                "category": category,
                                "topic": topic
                            }
                        ))
            else:
                # Fallback — use whole row as one document
                docs.append(Document(
                    page_content=content,
                    metadata={
                        "source": "csv_dataset",
                        "category": category,
                        "topic": topic
                    }
                ))

    print(f"📊 Loaded {len(docs)} individual facts from CSV.")
    return docs


# ─────────────────────────────────────────────
# 3. VECTOR DB — build or load from disk
# ─────────────────────────────────────────────
def get_vector_db():
    global _db

    # Return in-memory cached DB if already loaded this session
    if _db is not None:
        return _db

    # Load from disk if already built
    if os.path.exists("vector_db"):
        print("✅ Loading existing Vector DB from disk...")
        _db = Chroma(
            persist_directory="vector_db",
            embedding_function=_embeddings
        )
        return _db

    # ── First run: build from scratch ──
    print("📄 Loading PDF...")
    pdf_docs = load_pdf_with_tables("data/Rule_Book.pdf")

    print("📊 Loading CSV dataset...")
    csv_docs = load_csv("data/kiit_clean_dataset.csv")

    # Split only PDF docs — CSV facts are already atomic (one fact = one doc)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150
    )
    pdf_chunks = splitter.split_documents(pdf_docs)
    print(f"✂️  PDF chunks: {len(pdf_chunks)}")
    print(f"📦 CSV facts:  {len(csv_docs)}")

    all_chunks = pdf_chunks + csv_docs
    print(f"🔢 Total chunks to embed: {len(all_chunks)}")

    print("🧠 Building Vector DB (this runs only once)...")
    _db = Chroma.from_documents(
        all_chunks,
        _embeddings,
        persist_directory="vector_db"
    )
    print("✅ Vector DB ready!")
    return _db


# ─────────────────────────────────────────────
# 4. ASK QUESTION
# ─────────────────────────────────────────────
def ask_question(query: str, llm) -> str:

    db = get_vector_db()

    # Step 1: Translate Hinglish to English for better retrieval
    translate_prompt = f"""Convert this question to simple English. Output only the English question, nothing else.
Question: {query}
English:"""
    
    try:
        english_query = llm.invoke(translate_prompt).content.strip()
    except:
        english_query = query  # fallback to original if translation fails
    
    print(f"Original : {query}")
    print(f"Translated: {english_query}")

    retriever = db.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 8}
    )

    # Search with both original and translated query, combine results
    docs_english  = retriever.invoke(english_query)
    docs_original = retriever.invoke(query)

    # Deduplicate
    seen = set()
    all_docs = []
    for d in docs_english + docs_original:
        if d.page_content not in seen:
            seen.add(d.page_content)
            all_docs.append(d)

    all_docs = all_docs[:8]

    if not all_docs:
        return "❌ Sorry, I couldn't find relevant information for your question."

    context = "\n\n".join([d.page_content for d in all_docs])

    prompt = f"""
You are a precise and helpful KIIT University assistant chatbot.

Use ONLY the context below to answer the question.

STRICT RULES:
- Read the context carefully and answer only what is asked
- Do NOT mix up different types of fees, rooms, or conditions
- Do NOT say "I don't have that information" if the answer is clearly in the context
- If question is about grade differences, look for the score ranges in context and compare them directly
- Quote exact numbers and ranges from the context
- Always answer in English only, regardless of what language the question is asked inBe detailed and thorough — not just one line
- Use bullet points for multiple facts

Context:
{context}

Question: {query}

Answer:
"""

    response = llm.invoke(prompt)
    return response.content.strip()


# KIIT-GPT 🎓 — AI-Powered Campus Assistant

> An intelligent RAG-based chatbot built for the KIIT University community. Ask anything about placements, hostels, academics, grading, fees, and campus life — and get instant, accurate answers powered by Retrieval-Augmented Generation, running fully offline.

---

## 📸 Preview

![KIIT-GPT Flowchart](kiit_gpt_flowchart.jpg)

---

## ✨ Features

- 🔍 **RAG Pipeline** — Retrieves exact facts from a 41-page KIIT Rule Book PDF and 9,000+ atomic facts from a CSV dataset before generating answers
- 🌐 **Hinglish Support** — Translates Hindi/Hinglish queries to English before retrieval, so students can ask naturally
- 🧠 **Local LLM (phi3 via Ollama)** — Runs fully offline; no API key or internet required
- 💬 **Persistent Chat History** — Conversations saved in `localStorage` with search and multi-session support
- 🎨 **Dark Cyber-Green UI** — Polished, responsive interface with sidebar, suggestion chips, and typing indicators
- ⚡ **FastAPI Backend** — Lightweight async Python server; Vector DB preloaded once at startup for fast responses

---

## 🏗️ Architecture

```
Student Question (English / Hinglish)
        │
        ▼  HTTP POST
  FastAPI Backend
        │
        ▼
  Translate to English (phi3 LLM)
        │
        ▼
  Convert Query → Vector (all-mpnet-base-v2, 768 dims)
        │
        ▼
  Search ChromaDB ◄──── Rule Book PDF (41 pages + tables)
                  ◄──── CSV Dataset (9,000+ atomic facts)
        │
        ▼
  Build Prompt (instructions + context + question)
        │
        ▼
  phi3 LLM via Ollama (generates answer from context only)
        │
        ▼
  JSON → JavaScript → Chat Bubble (displayed to student)
```

### Stack at a Glance

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript, localStorage |
| Backend | Python, FastAPI, Uvicorn |
| Embeddings | `sentence-transformers/all-mpnet-base-v2` (768-dim) |
| Vector Store | ChromaDB (persisted to local disk) |
| LLM | phi3 via Ollama (swap to llama3 for higher quality) |
| PDF Parsing | pdfplumber (text + table extraction) |
| Data | KIIT Rule Book PDF + custom CSV dataset |

---

## 📁 Project Structure

```
kiit-gpt/
│
├── data/
│   ├── Rule_Book.pdf           # KIIT Rule Book — 41 pages, parsed with pdfplumber
│   └── kiit_clean_dataset.csv  # 9,000+ atomic KIIT facts (topic, category, content)
│
├── images/
│   ├── kiit_logo.png
│   ├── Samantha_image.png
│   └── saumya_image.png
│
├── vector_db/                  # Auto-generated ChromaDB store (created on first run)
│
├── index.html                  # Main chat interface
├── style.css                   # Chat page styles
├── script.js                   # Chat logic — history, API calls, UI
│
├── about.html                  # About KIIT page
├── academic.html               # Academics page
├── placements.html             # Placements page
├── contact.html                # Contact page
├── home.html                   # Home page
│
├── main_style.css              # Shared CSS design system (tokens, nav, footer, cards)
├── main_script.js              # Shared JS (mobile nav, scroll-reveal, counter animations)
│
├── main.py                     # FastAPI server — /chat endpoint
├── rag_pipeline.py             # Full RAG pipeline (load → embed → retrieve → answer)
├── requirements.txt            # Python dependencies
│
└── kiit_gpt_flowchart.jpg      # System architecture diagram
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- [Ollama](https://ollama.com/) installed and running
- Node.js (optional, only if using a local dev server for the frontend)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/kiit-gpt.git
cd kiit-gpt
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Pull the LLM via Ollama

```bash
ollama pull phi3
```

> For better answer quality, use `llama3` instead and update `main.py` accordingly:
> ```python
> llm = ChatOllama(model="llama3")
> ```

### 4. Add Your Data Files

Place the following in the `data/` folder:

```
data/
├── Rule_Book.pdf
└── kiit_clean_dataset.csv
```

The CSV must have columns: `topic`, `category`, `content` (with bullet points starting with `-`).

### 5. Start the Backend

```bash
uvicorn main:app --reload
```

On first run, the RAG pipeline builds and persists the ChromaDB vector store — this takes a few minutes. Subsequent starts load it instantly from disk.

The API is now live at `http://127.0.0.1:8000`.

### 6. Open the Frontend

Open `index.html` directly in your browser, or serve it with any static server:

```bash
# Python quick server
python -m http.server 5500
```

Then visit `http://localhost:5500`.

---

## 🔌 API Reference

### `POST /chat`

Send a question and receive an AI-generated answer.

**Request Body**
```json
{
  "query": "What is the minimum attendance required at KIIT?"
}
```

**Response**
```json
{
  "answer": "The minimum attendance required at KIIT is 75%..."
}
```

**Error Response**
```json
{
  "detail": "Query cannot be empty."
}
```

---

## 💡 How RAG Works Here

1. **Data Ingestion** — The Rule Book PDF is parsed page-by-page (text + tables). The CSV dataset is split into individual atomic facts (one fact = one document) to prevent the LLM from mixing unrelated information.

2. **Embedding** — All documents are converted to 768-dimensional vectors using `all-mpnet-base-v2` and stored in ChromaDB on disk.

3. **Query Time** — The student's question is first translated to English (to handle Hinglish), then embedded and used to retrieve the top 8 most similar chunks. Both the original and translated queries are searched and results are deduplicated.

4. **Generation** — The retrieved context, original question, and strict instructions are assembled into a prompt. phi3 generates an answer using *only* the provided context — it will not hallucinate facts not found in the data.

---

## 🎨 Frontend Pages

| Page | File | Description |
|---|---|---|
| Chat | `index.html` | Main AI chat interface |
| Home | `home.html` | Landing page with stats |
| About | `about.html` | About KIIT University |
| Academics | `academic.html` | Academic programs info |
| Placements | `placements.html` | Placement statistics |
| Contact | `contact.html` | Contact information |

All pages share `main_style.css` (design system) and `main_script.js` (mobile nav, animations).

---

## ⚙️ Configuration

| Setting | Location | Default |
|---|---|---|
| LLM Model | `main.py` → `ChatOllama(model=...)` | `phi3` |
| Retrieved Chunks | `rag_pipeline.py` → `search_kwargs={"k": 8}` | `8` |
| Chunk Size | `rag_pipeline.py` → `RecursiveCharacterTextSplitter` | `1000` chars |
| Chunk Overlap | `rag_pipeline.py` → `chunk_overlap` | `150` chars |
| API URL | `script.js` → `API_URL` | `http://127.0.0.1:8000/chat` |

---

## 🛠️ Troubleshooting

**`Cannot connect to backend`** — Make sure `uvicorn main:app --reload` is running and accessible on port 8000.

**Slow first startup** — The vector DB is being built for the first time. This is a one-time process; subsequent starts are instant.

**Poor answer quality** — Switch the LLM from `phi3` to `llama3` in `main.py` for significantly better results.

**Hinglish not understood** — The translation step depends on the LLM. If it fails, the pipeline falls back to the original query automatically.

---

## 👥 Team

| Name | Role |
|---|---|
| **Prof. Achyuta Samanta** | Founder, KIIT & KISS |
| **Dr. Soumya Ranjan Mishra** | Faculty Guide & Project Supervisor |

---

## 📄 License

This project is built for the KIIT community and is intended for educational purposes.

---

## 🙏 Acknowledgements

- [Ollama](https://ollama.com/) — Local LLM inference
- [LangChain](https://www.langchain.com/) — RAG orchestration
- [ChromaDB](https://www.trychroma.com/) — Vector store
- [HuggingFace](https://huggingface.co/) — `all-mpnet-base-v2` embeddings
- [FastAPI](https://fastapi.tiangolo.com/) — Python backend framework
- Kalinga Institute of Industrial Technology, Bhubaneswar, Odisha

---

<div align="center">
  Built with ❤️ for the KIIT Community &nbsp;·&nbsp; KIIT-GPT v1.0
</div>

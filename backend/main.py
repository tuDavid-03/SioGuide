from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel
from supabase import create_client, Client

from config import settings

# ---------------------------------------------------------------------------
# Gemini kliens (újrafelhasználható, alkalmazás élettartamán át)
# ---------------------------------------------------------------------------
_gemini_client: genai.Client | None = None
_supabase_client: Client | None = None

EMBEDDING_MODEL = "gemini-embedding-001"  # 768 dim (output_dimensionality=768)
CHAT_MODEL      = "gemini-3.8-flash"      # API által megkövetelt aktuális modell


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Kliens objektumok inicializálása induláskor, cleanup leálláskor."""
    global _gemini_client, _supabase_client
    _gemini_client  = genai.Client(api_key=settings.gemini_api_key)
    _supabase_client = create_client(settings.supabase_url, settings.supabase_service_key)
    yield
    # (opcionális cleanup)


app = FastAPI(
    title="SioGuide API",
    description="RAG-alapú turisztikai asszisztens a siófoki Müller's vendégházak számára.",
    version="0.2.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS – React frontend (Vite dev + Vercel)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Sémák
# ---------------------------------------------------------------------------

class AskRequest(BaseModel):
    question: str

class LocationResult(BaseModel):
    id: int
    name: str
    description: str
    category: str
    similarity: float

class AskResponse(BaseModel):
    answer: str
    sources: list[LocationResult]


# ---------------------------------------------------------------------------
# Segédfüggvények
# ---------------------------------------------------------------------------

def _get_embedding(text: str) -> list[float]:
    """Szöveg vektorizálása a Gemini gemini-embedding-001 modellel (768 dim)."""
    response = _gemini_client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768,  # Leszorítás 768-ra (pgvector séma)
        ),
    )
    return response.embeddings[0].values


def _retrieve_locations(embedding: list[float], threshold: float = 0.4, count: int = 5) -> list[dict]:
    """Releváns helyszínek lekérése a Supabase match_locations RPC-n keresztül."""
    response = (
        _supabase_client
        .rpc("match_locations", {
            "query_embedding": embedding,
            "match_threshold": threshold,
            "match_count": count,
        })
        .execute()
    )
    return response.data or []


def _build_prompt(question: str, locations: list[dict]) -> str:
    """RAG prompt összeállítása a lekért kontextusból."""
    if not locations:
        context = "Jelenleg nem áll rendelkezésre releváns helyi adat."
    else:
        context_parts = []
        for loc in locations:
            context_parts.append(
                f"- **{loc['name']}** ({loc['category']}): {loc['description']}"
            )
        context = "\n".join(context_parts)

    return f"""Te egy segítőkész turisztikai asszisztens vagy a siófoki Müller's vendégházak számára.
A vendégek kérdéseire barátságos, tömör, magyar nyelvű választ adsz.
KIZÁRÓLAG az alábbi, megbízható helyi adatforrásra támaszkodj. Ha a kérdés nem kapcsolódik a kontextushoz, jelezd udvariasan.

## Elérhető helyi információk:
{context}

## Vendég kérdése:
{question}

## Válaszod:"""


def _generate_answer(prompt: str) -> str:
    """Válasz generálása a Gemini 1.5 Flash modellel."""
    response = _gemini_client.models.generate_content(
        model=CHAT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.4,
            max_output_tokens=512,
        ),
    )
    return response.text


# ---------------------------------------------------------------------------
# Végpontok
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
async def health_check():
    """Életjel-végpont a CI/CD pipeline és monitoring számára."""
    return {"status": "ok", "service": "SioGuide API", "version": app.version}


@app.post("/ask", response_model=AskResponse, tags=["rag"])
async def ask(body: AskRequest):
    """
    RAG-alapú kérdés-válasz végpont.

    1. A kérdést vektorizálja (Gemini text-embedding-004).
    2. Lekéri a leginkább releváns helyszíneket (Supabase pgvector).
    3. Választ generál a kontextus alapján (Gemini 1.5 Flash).
    """
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="A kérdés nem lehet üres.")

    try:
        # 1. Vektorizálás
        embedding = _get_embedding(body.question)

        # 2. Retrieval
        raw_locations = _retrieve_locations(embedding)

        # 3. Generálás
        prompt  = _build_prompt(body.question, raw_locations)
        answer  = _generate_answer(prompt)

        sources = [LocationResult(**loc) for loc in raw_locations]
        return AskResponse(answer=answer, sources=sources)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

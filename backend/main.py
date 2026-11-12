from contextlib import asynccontextmanager

import httpx
from datetime import datetime
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

# Open-Meteo – Siófok koordinátái (ingyenes, kulcs nélkül)
_WEATHER_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=46.9067&longitude=18.0511"
    "&current=temperature_2m,weathercode"
    "&timezone=Europe%2FBudapest"
)

# WMO időjárás kód → magyar leírás (leggyakoribb értékek)
_WMO_DESCRIPTIONS: dict[int, str] = {
    0:  "derült, napos idő",
    1:  "többnyire napos",
    2:  "részben felhős",
    3:  "borult",
    45: "ködös",
    48: "zúzmarás köd",
    51: "szitáló eső",
    53: "mérsékelt szitálás",
    55: "erős szitálás",
    61: "gyenge eső",
    63: "mérsékelt eső",
    65: "erős eső",
    71: "gyenge havazás",
    73: "mérsékelt havazás",
    75: "erős havazás",
    80: "záporok",
    81: "mérsékelt záporok",
    82: "erős záporok",
    95: "zivatar",
    96: "jégesővel kísért zivatar",
    99: "erős jégeső",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Kliens objektumok inicializálása induláskor, cleanup leálláskor."""
    global _gemini_client, _supabase_client
    _gemini_client   = genai.Client(api_key=settings.gemini_api_key)
    _supabase_client = create_client(settings.supabase_url, settings.supabase_service_key)
    yield


app = FastAPI(
    title="SioGuide API",
    description="RAG-alapú turisztikai asszisztens a siófoki Müller's vendégházak számára.",
    version="0.3.0",
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

async def _get_weather() -> str:
    """
    Lekéri a siófoki aktuális időjárást az Open-Meteo API-ról (kulcs nélkül),
    és hozzáfűzi a pontos helyi időt is.
    Hiba esetén csak az időt adja vissza, hogy ne akadályozza a RAG folyamatot.
    """
    now = datetime.now()
    time_str = now.strftime("%H:%M")

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(_WEATHER_URL)  # ← helyes: await a coroutine-on
            resp.raise_for_status()
            data = resp.json()

        current   = data["current"]
        temp      = round(current["temperature_2m"])
        wmo_code  = int(current["weathercode"])
        condition = _WMO_DESCRIPTIONS.get(wmo_code, "változékony időjárás")

        return f"Jelenleg Siófokon {time_str} van, és {temp}°C, {condition}."
    except Exception:
        # Ha az API nem elérhető, legalább az időt adjuk vissza
        return f"Jelenleg Siófokon {time_str} van."


def _get_embedding(text: str) -> list[float]:
    """Szöveg vektorizálása a Gemini gemini-embedding-001 modellel (768 dim)."""
    response = _gemini_client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=768,
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
            "match_count":     count,
        })
        .execute()
    )
    return response.data or []


def _build_prompt(question: str, locations: list[dict], weather: str) -> str:
    """RAG prompt összeállítása a lekért kontextusból + időjárás + napszak info."""
    if not locations:
        location_context = "Jelenleg nem áll rendelkezésre releváns helyi adat."
    else:
        location_context = "\n".join(
            f"- **{loc['name']}** ({loc['category']}): {loc['description']}"
            for loc in locations
        )

    # Napszak meghatározása a programajánláshoz
    hour = datetime.now().hour
    if 6 <= hour < 12:
        time_of_day_tip = "Most reggel/délelőtt van: reggeli, kávézó, piac vagy aktív szabadtéri programot ajánlj."
    elif 12 <= hour < 17:
        time_of_day_tip = "Most délután van: strand, hajókirándulás, étterem vagy látványosságot ajánlj."
    elif 17 <= hour < 22:
        time_of_day_tip = "Most este van: vacsora, bár, sétány, esti hajózás vagy kulturális eseményt ajánlj."
    else:
        time_of_day_tip = "Most éjszaka van: csak éjjel is nyitva tartó helyeket (bár, étterem) ajánlj, és jelezd, mi van zárva."

    # Az időjárás + idő rejtett kontextusként jelenik meg
    weather_context = f"\n## Aktuális idő és időjárás Siófokon:\n{weather}" if weather else ""

    return f"""Te egy segítőkész turisztikai asszisztens vagy a siófoki Müller's vendégházak számára.
A vendégek kérdéseire barátságos, tömör, magyar nyelvű választ adsz.
KIZÁRÓLAG az alábbi, megbízható helyi adatforrásra támaszkodj. Ha a kérdés nem kapcsolódik a kontextushoz, jelezd udvariasan.
Vedd figyelembe az aktuális időt és időjárást: {time_of_day_tip}
Esős, hideg időben beltéri programokat (étterem, múzeum, kávézó) részesítsd előnyben; szép időben szabadtérieket (strand, kerékpározás, hajókirándulás).{weather_context}

## Elérhető helyi információk:
{location_context}

## Vendég kérdése:
{question}

## Válaszod:"""


def _generate_answer(prompt: str) -> str:
    """Válasz generálása a Gemini Flash modellel."""
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

    1. Lekéri Siófok aktuális időjárását (Open-Meteo API).
    2. A kérdést vektorizálja (Gemini gemini-embedding-001, 768 dim).
    3. Lekéri a leginkább releváns helyszíneket (Supabase pgvector).
    4. Választ generál az időjárás + helyszínek kontextusával (Gemini Flash).
    """
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="A kérdés nem lehet üres.")

    try:
        # 1. Időjárás (aszinkron, nem blokkoló)
        weather = await _get_weather()

        # 2. Vektorizálás
        embedding = _get_embedding(body.question)

        # 3. Retrieval
        raw_locations = _retrieve_locations(embedding)

        # 4. Generálás
        prompt = _build_prompt(body.question, raw_locations, weather)
        answer = _generate_answer(prompt)

        sources = [LocationResult(**loc) for loc in raw_locations]
        return AskResponse(answer=answer, sources=sources)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

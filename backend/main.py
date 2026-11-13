import os
from contextlib import asynccontextmanager
from datetime import datetime

import httpx
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel
from supabase import create_client, Client

from config import settings

# ---------------------------------------------------------------------------
# Globális kliensek és modellek
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

# WMO időjárás kód → magyar leírás
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


# ---------------------------------------------------------------------------
# Gemini Agentic Tool: Google Maps gyalogos távolság és menetidő kalkulátor
# ---------------------------------------------------------------------------

def get_walking_distance(origin: str, destination: str) -> str:
    """Lekéri a gyalogos távolságot és a becsült menetidőt két siófoki helyszín között a Google Maps Distance Matrix API-val.

    Args:
        origin: Kiindulási cím vagy helyszín Siófokon (pl. "Müller's Vendégház Fő utca 104" vagy "Kálmán Imre sétány 9").
        destination: Célállomás címe vagy helyszín neve Siófokon (pl. "Siófoki Nagystrand", "Pietro Pizzeria").

    Returns:
        Szöveges formázott távolság és menetidő, vagy hibaüzenet.
    """
    api_key = settings.google_maps_api_key or os.environ.get("GOOGLE_MAPS_API_KEY", "")
    if not api_key:
        return "A Google Maps API kulcs nincs konfigurálva a szerveren."

    origin_query = f"{origin.strip()}, Siófok, Hungary"
    destination_query = f"{destination.strip()}, Siófok, Hungary"

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origin_query,
        "destinations": destination_query,
        "mode": "walking",
        "language": "hu",
        "key": api_key,
    }

    try:
        resp = requests.get(url, params=params, timeout=5.0)
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") != "OK":
            return f"Google Maps szolgáltatás hiba: {data.get('status')}"

        rows = data.get("rows", [])
        if not rows or not rows[0].get("elements"):
            return "Nem található útvonal a megadott pontok között."

        element = rows[0]["elements"][0]
        if element.get("status") != "OK":
            return f"Nem található gyalogos útvonal ({element.get('status')})."

        distance = element["distance"]["text"]
        duration = element["duration"]["text"]
        return f"Gyalogos távolság: {distance}, becsült menetidő: {duration}."

    except Exception as exc:
        return f"Hiba az útvonal lekérdezésekor: {exc}"


# ---------------------------------------------------------------------------
# Lifespan & FastAPI App
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Kliens objektumok inicializálása induláskor."""
    global _gemini_client, _supabase_client
    _gemini_client   = genai.Client(api_key=settings.gemini_api_key)
    _supabase_client = create_client(settings.supabase_url, settings.supabase_service_key)
    yield


app = FastAPI(
    title="SioGuide API",
    description="RAG és Agentic AI turisztikai asszisztens a siófoki Müller's vendégházak számára.",
    version="0.5.0",
    lifespan=lifespan,
)

# CORS – Vite dev szerver és Vercel preview/production
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
    discount_info: str | None = None
    similarity: float


class AskResponse(BaseModel):
    answer: str
    sources: list[LocationResult]


# ---------------------------------------------------------------------------
# Segédfüggvények
# ---------------------------------------------------------------------------

async def _get_weather() -> str:
    """Lekéri a siófoki aktuális időjárást és a pontos időt."""
    now = datetime.now()
    time_str = now.strftime("%H:%M")

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(_WEATHER_URL)
            resp.raise_for_status()
            data = resp.json()

        current   = data["current"]
        temp      = round(current["temperature_2m"])
        wmo_code  = int(current["weathercode"])
        condition = _WMO_DESCRIPTIONS.get(wmo_code, "változékony időjárás")

        return f"Jelenleg Siófokon {time_str} van, és {temp}°C, {condition}."
    except Exception:
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


def _retrieve_locations(embedding: list[float], threshold: float = 0.3, count: int = 5) -> list[dict]:
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


def _build_system_instruction(locations: list[dict], weather: str) -> str:
    """Rendszerutasítás és RAG kontextus összeállítása az Agentic Chat számára."""
    if not locations:
        location_context = "Jelenleg nem áll rendelkezésre releváns helyi adat az adatbázisban."
    else:
        parts = []
        for loc in locations:
            discount = loc.get("discount_info")
            discount_text = discount if discount else "Nincs"
            parts.append(
                f"- **{loc['name']}** ({loc['category']}): {loc['description']}\n"
                f"  * Müller's Kedvezmény: {discount_text}"
            )
        location_context = "\n".join(parts)

    # Napszak meghatározása
    hour = datetime.now().hour
    if 6 <= hour < 12:
        time_of_day_tip = "Most reggel/délelőtt van: reggeli, kávézó, piac vagy aktív szabadtéri programot ajánlj."
    elif 12 <= hour < 17:
        time_of_day_tip = "Most délután van: strand, hajókirándulás, étterem vagy látványosságot ajánlj."
    elif 17 <= hour < 22:
        time_of_day_tip = "Most este van: vacsora, bár, sétány, esti hajózás vagy kulturális eseményt ajánlj."
    else:
        time_of_day_tip = "Most éjszaka van: csak éjjel is nyitva tartó helyeket (bár, szórakozóhely) ajánlj, és jelezd, mi van zárva."

    weather_context = f"\n## Aktuális idő és időjárás Siófokon:\n{weather}" if weather else ""

    return f"""Te egy intelligens és segítőkész turisztikai asszisztens vagy a siófoki Müller's vendégházak számára.
A vendégek kérdéseire barátságos, segítőkész és tömör választ adsz.
KIZÁRÓLAG az alábbi helyi adatforrásra és a rendelkezésedre álló eszközökre támaszkodj.

## Többnyelvűség és Nyelvi Szabály:
A RAG adatbázisból kapott kontextus (helyszínek, leírások, kedvezmények) magyar nyelvű. A te szigorú feladatod, hogy KIZÁRÓLAG azon a nyelven válaszolj, amin a felhasználó a kérdést feltette (pl. angolul, németül, magyarul). A magyar nyelvű kedvezményeket, leírásokat és tudnivalókat ültesd át a felhasználó nyelvére a válaszodban! A tulajdonneveket (pl. Müller's Vendégház, Nagystrand, Pietro Pizzeria) tartsd meg felismerhetően.

## Kedvezmények és Útvonaltervezés:
Ha a helyszínhez tartozik Müller's Kedvezmény, azt MINDIG emeld ki a válaszodban a vendégek örömére!
Ha a vendég távolságot, sétaidőt kérdez vagy útvonalat keres a vendégház és egy célpont között, hívd meg a get_walking_distance eszközt.
Képes vagy komplex, többállomásos menetterveket is összeállítani. Ha a felhasználó több helyszínt vagy programot szeretne meglátogatni egymás után, logikusan fűzd össze őket, és feltétlenül használd az útvonaltervező eszközt az állomások közötti távolságok és gyalogos idők kiszámítására.

## Időjárás és Napszak:
Vedd figyelembe az aktuális időt és időjárást: {time_of_day_tip}
Esős, hideg időben beltéri programokat (wellness, múzeum, étterem) részesíts előnyben; szép időben szabadtérieket.{weather_context}

## Elérhető helyi információk és Müller's kedvezmények:
{location_context}
"""


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
    Agentic RAG kérdés-válasz végpont.

    1. Élő időjárás lekérése (Open-Meteo).
    2. Szövegvektorizálás (Gemini gemini-embedding-001, 768 dim).
    3. Hasonlósági visszakeresés kedvezményekkel (Supabase match_locations).
    4. Agentic Chat LLM hívás Google Maps Tool Calling támogatással (Gemini 3.8 Flash).
    """
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="A kérdés nem lehet üres.")

    try:
        # 1. Időjárás és idő
        weather = await _get_weather()

        # 2. Vektorizálás
        embedding = _get_embedding(body.question)

        # 3. Visszakeresés
        raw_locations = _retrieve_locations(embedding)

        # 4. Rendszerutasítás és RAG kontextus építése kedvezményekkel
        system_instruction = _build_system_instruction(raw_locations, weather)

        # 5. Gemini Agentic Chat automatikus Tool Calling-gal
        chat = _gemini_client.chats.create(
            model=CHAT_MODEL,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[get_walking_distance],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=False),
                temperature=0.3,
                max_output_tokens=1024,
            ),
        )

        response = chat.send_message(body.question)
        answer = response.text or "Sajnos nem sikerült választ generálni."

        sources = [LocationResult(**loc) for loc in raw_locations]
        return AskResponse(answer=answer, sources=sources)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

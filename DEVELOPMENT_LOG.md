# SioGuide – Fejlesztési Napló (Development Log)

> Minden fázis végén frissítve. A naplót az AI asszisztens és a fejlesztő közösen tartja karban.

---

## Fázis 1 – Backend alapok ✅

### 1.1 – Supabase pgvector séma

**Dátum:** 2026-11-12

**Elvégzett munkák:**
- `pgvector` extension engedélyezve a Supabase projektben (MCP-n keresztül)
- `public.locations` tábla létrehozva a következő oszlopokkal:
  - `id` – `bigint`, auto-increment PK
  - `name` – `text`
  - `description` – `text`
  - `category` – `text`
  - `embedding` – `vector(768)` *(eredetileg 1536, majd Gemini-re váltás miatt 768-ra módosítva)*
  - `created_at` – `timestamptz`
- IVFFlat vektorindex: `vector_cosine_ops`, `lists=100`
- RLS engedélyezve; `anon` + `authenticated` szerepkörök olvashatnak
- `public.match_locations(query_embedding, match_threshold, match_count)` RPC függvény: kosinusz-hasonlóság alapú keresés

**Megjegyzés:** Az embedding dimenzió eredetileg 1536 (OpenAI) volt, de az API-váltás (Gemini) miatt 768-ra lett módosítva.

---

### 1.2 – FastAPI alapok

**Dátum:** 2026-11-12

**Fájlok:**
- `backend/requirements.txt` – függőségek: FastAPI, Uvicorn, Supabase, google-genai, httpx, pydantic-settings
- `backend/config.py` – `pydantic-settings` alapú konfiguráció, `.env` betöltés (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`)
- `backend/main.py` – FastAPI alkalmazás, CORS middleware, `GET /health` végpont

**Architektúra:**
```
backend/
├── main.py         # FastAPI app + végpontok
├── config.py       # Pydantic Settings (.env betöltés)
├── requirements.txt
└── seed.py         # (Fázis 2.1-ben kerül ide)
```

---

### 1.3 – RAG /ask végpont

**Dátum:** 2026-11-12

**Végpont:** `POST /ask`

**Kérés:**
```json
{ "question": "Hol eszem jót Siófokon?" }
```

**Válasz:**
```json
{
  "answer": "...",
  "sources": [
    { "id": 1, "name": "...", "description": "...", "category": "...", "similarity": 0.82 }
  ]
}
```

**RAG pipeline:**
```
Felhasználói kérdés
  ↓ gemini-embedding-001 (768 dim, RETRIEVAL_QUERY)
  ↓ Supabase match_locations RPC (cosine similarity, threshold=0.3)
  ↓ _build_prompt() – kontextus + időjárás + napszak összeállítása
  ↓ gemini-3.8-flash (temperature=0.4, max_tokens=512)
  → { answer, sources }
```

**Modellek:**
| Feladat | Modell | Megjegyzés |
|---------|--------|-----------|
| Embedding | `gemini-embedding-001` | 768 dim, `output_dimensionality=768` |
| Generálás | `gemini-3.8-flash` | RAG prompt, temperature=0.4 |

**Bugfix napló (modellnevek):**
- `text-embedding-004` → deprecated, cseréve: `gemini-embedding-001`
- `gemini-1.5-flash` → deprecated, csere: `gemini-2.0-flash`
- `gemini-2.0-flash` → deprecated, csere: `gemini-3.8-flash` *(API hibaüzenet alapján)*

---

### 1.4 – Open-Meteo időjárás integráció

**Dátum:** 2026-11-12

**Funkció:** `async _get_weather() -> str`

**API:** `https://api.open-meteo.com/v1/forecast` – ingyenes, kulcs nélkül

**Siófok koordinátái:** `46.9067°N, 18.0511°E`

**Lekért adatok:** `temperature_2m`, `weathercode` (WMO szabvány)

**Kimenet (példa):** `"Jelenleg Siófokon 17:21 van, és 9°C, gyenge eső."`

**Fail-safe:** API hiba esetén csak az időt adja vissza: `"Jelenleg Siófokon 17:21 van."`

**Napszak-érzékeny prompt logika** (`datetime.now().hour` alapján):

| Időszak | Instrukció |
|---------|-----------|
| 06–12 | Reggeli, kávézó, piac, aktív szabadtéri |
| 12–17 | Strand, hajókirándulás, étterem, látványosság |
| 17–22 | Vacsora, bár, sétány, esti programok |
| 22–06 | Csak éjjel nyitva tartó helyek |

**Bugfix:** Dupla `client.get()` hívás javítva (`RuntimeWarning: coroutine was never awaited`)

---

## Fázis 2 – Adatok és Frontend ✅

### 2.1 – seed.py adatgeneráló szkript

**Dátum:** 2026-11-12

**Fájl:** `backend/seed.py`

**Futtatás:** `python seed.py` (a `backend/` mappából)

**17 helyszín, 6 kategóriában:**

| Kategória | Darab | Példák |
|-----------|-------|--------|
| szállás | 3 | Müller's Fő u. 104-106, Kálmán Imre sétány 9, Fő u. 114 |
| strand | 2 | Nagystrand, Aranypart |
| étterem | 3 | Halászcsárda, Palace, Renegát Pub |
| beltéri/esős | 4 | Wellness, Kálmán Emlékház, Szabadulószoba, Mozi |
| szabadtéri | 3 | BAHART hajó, Kerékpárút, Vízisport |
| esti | 2 | Flört Club, Kikötői sétány |

**Működés:**
1. Tábla törlése (idempotens)
2. `name + description` szöveg vektorizálása (`RETRIEVAL_DOCUMENT`, 768 dim)
3. 0.5 mp késleltetés (rate limit)
4. Batch insert Supabase-be

---

### 2.2 – React + Vite Chat UI

**Dátum:** 2026-11-12

**Fájl:** `frontend/` mappa (Vite + React + Tailwind CSS)

**Komponensek:**
- `App.jsx` – fő chat logika (fetch, üzenetlista, scroll, hibaállapot)
- `ChatMessage.jsx` – user/assistant chat buborékok, egyszerű markdown render
- `SourceCard.jsx` – RAG forrás kártyák (kategória ikon, similarity %, leírás)
- `LoadingDots.jsx` – pattogó betöltő animáció

**CORS:** a backend `main.py`-ban engedélyezve: `http://localhost:5173` és `https://*.vercel.app`

---

### 2.3 – Forrás kártyák + RAG debug

**Dátum:** 2026-11-12

**SourceCard.jsx újraírva:**
- 11 kategória egyedi emoji ikonnal és színes badge-dzsel
- Hover: `shadow-lg`, `-translate-y-0.5`, háttér-gradient, leírás kinyílik (`line-clamp-none`)
- Hasonlósági progress sáv (zöld/sárga/narancs/szürke küszöbök)
- Nagy, félkövér hasonlósági % szám + szöveges minősítés (Kiváló / Jó / Részleges / Gyenge)

**RAG debug (`_retrieve_locations`):**
- `match_threshold`: `0.3 → 0.1` (extrém alacsony, debug célra)
- `print()` logolás hozzáadva: threshold, találatszám, minden találat neve + similarity pontszáma
- Ha nulla találat: figyelmeztetés nyomtatva a terminálba

---

## Technológiai Stack összefoglaló

```
┌─────────────────────────────────────────────────────────┐
│                    SIOGUIDE ARCHITEKTÚRA                │
├─────────────────────────────────────────────────────────┤
│  Frontend   │ React + Vite + Tailwind CSS (Vercel CI)  │
├─────────────────────────────────────────────────────────┤
│  Backend    │ FastAPI (Python) + Uvicorn                │
│             │ POST /ask  –  RAG pipeline               │
│             │ GET  /health  –  monitoring              │
├─────────────────────────────────────────────────────────┤
│  AI         │ gemini-embedding-001  (768 dim)          │
│             │ gemini-3.8-flash  (válaszgenerálás)      │
│             │ Open-Meteo API  (időjárás, kulcs nélkül) │
├─────────────────────────────────────────────────────────┤
│  Adatbázis  │ Supabase (PostgreSQL 17 + pgvector)      │
│             │ locations tábla, vector(768)             │
│             │ match_locations RPC (cosine similarity)  │
└─────────────────────────────────────────────────────────┘
```

---

## Fázis 5 – Agentic RAG, Interaktív UI és Kedvezmények 🚀

### 5.1 – Adatbázis séma bővítése és Partnerkedvezmények

**Dátum:** 2026-11-13

- `locations` tábla kiegészítve `discount_info text DEFAULT NULL` oszloppal.
- `match_locations` RPC frissítve, hogy a szemantikus keresés eredményében visszaadja a `discount_info` mezőt is.
- `backend/seed.py` frissítve 6 kiemelt partnerkedvezménnyel (Pietro Pizzeria, Palace Wellness, Renegát Burger, Escape60, Vízisport Centrum, Flört Club).
- A vektorizálási folyamat a kedvezmények leírását is beágyazza a pontosság érdekében.

---

### 5.2 – Gemini Function Calling & Google Maps Tool

**Dátum:** 2026-11-13

- `requests` modul integrálva.
- `get_walking_distance(origin: str, destination: str) -> str` globális eszköz implementálva a Google Maps Distance Matrix API-hoz (gyalogos mód, magyar nyelv).
- Áttérés a `google.genai` SDK `client.chats.create` metódusára.
- Automatikus függvényhívás engedélyezve: `automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=False)`.
- RAG kontextus dinamikusan tartalmazza a `Müller's Kedvezmény` adatokat minden lekért helyszínhez.

---

### 5.3 – Frontend Interaktív UI: PlaceModal & Kedvezmény Badge-ek

**Dátum:** 2026-11-13

- `frontend/src/components/SourceCard.jsx`:
  - Kattinthatóvá téve az egész kártya (`cursor-pointer`, `onClick`, billentyűzet-navigáció `Enter`/`Space`).
  - Animált, figyelemfelkeltő `🎁 Müller's Kedvezmény` arany-rózsaszín badge megjelenítése, ha elérhető a helyszínhez `discount_info`.
  - Alsó térkép indikátor sáv hozzáadva (`🗺️ Térkép →`).
- `frontend/src/components/PlaceModal.jsx`:
  - Felugró, sötétített hátterű modális ablak Tailwind-del és sima `fadeIn` + `scaleUp` animációval.
  - Helyszín neve, kategória ikonja, leírása és százalékos egyezése.
  - Kiemelt Müller's partnerkedvezmény blokk részletes felmutatási instrukcióval.
  - Beágyazott interaktív Google Térkép iframe a `VITE_GOOGLE_MAPS_API_KEY` segítségével (`https://www.google.com/maps/embed/v1/place`).
  - Külső útvonaltervezési gomb és bezárási lehetőség (X gomb, Escape billentyű vagy háttérre kattintás).
- `frontend/src/App.jsx`:
  - `selectedPlace` állapot kezelése és összekötése a `SourceCard` kattintásokkal.
  - Frissített fejléc jelvények (Partnerkedvezmények & Google Maps).

---

### 5.4 – Többállomásos Menetterv Prompt & Stabil Béta Dokumentáció

**Dátum:** 2026-11-13

- `backend/main.py`: Gemini `system_instruction` kiegészítve a többállomásos menettervek és komplex útvonalak összeállítására vonatkozó instrukcióval, kötelező eszközként előírva a `get_walking_distance` használatát a szakaszok távolságainak és gyalogos idejének kiszámítására.
- `README.md`: Teljes körű dokumentáció frissítés a stabil Béta verzióhoz: Agentic AI architektúra, Google Maps Distance Matrix Tool Calling, RAG-ba ágyazott `discount_info` kedvezmények, interaktív Google Maps Embed iframe-ek és Fázis 6 továbbfejlesztési roadmap.
- `PROJECT_BOARD.md`: Fázis 5 lezárva, új Fázis 6 (továbbfejlesztési ötlettár) bevezetve.

---

## Fázis 6 – Hangalapú Interakció, Többnyelvűség és UI Finomhangolás 🎙️🌍

### 6.1 – Web Speech API Beszédfelismerés (Diktálás)

**Dátum:** 2026-11-13

- `frontend/src/App.jsx`:
  - Beépítve a natív böngészős `window.SpeechRecognition || window.webkitSpeechRecognition` API.
  - Elegáns, reszponzív mikrofon gomb a beviteli mező mellett (`🎙️` / `🛑`).
  - Dinamikus, pulzáló hallgatózási állapotjelző sáv piros ping animációval és leállítási lehetőséggel.
  - Beszédfelismerés eredményének automatikus beírása és hozzáfűzése a chat input mezőhöz.

---

### 6.3.1 – Token Limit Emelés & Ár / Kontakt RAG Kiegészítés

**Dátum:** 2026-11-13

- `backend/main.py`:
  - `max_output_tokens` megnövelve 1024-ről 4096-ra a `client.chats.create` hívásban, megelőzve a komplex többállomásos menettervek levágását.
  - A Gemini rendszerutasítás felkészítve a helyszínek árainak és asztalfoglalási telefonszámainak felhasználására és megbízható költségbecslések adására.
- `backend/seed.py`:
  - Minden helyszínhez bekerültek konkrét árak (`price_info`) és elérhetőségek/telefonszámok (`contact`).
  - A gazdagított leírás automatikusan összefűzi ezeket az adatokat a leírással és a beágyazandó szöveggel, így SQL migráció nélkül a vektorok, a RAG kontextus, a kártyák és a modálok is tartalmazzák az árakat és elérhetőségeket.
  - Supabase adatbázis sikeresen frissítve.







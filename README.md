# SioGuide 🌊 – Agentic RAG Turisztikai és Szállás-asszisztens

> **Egyetemi Projekt Dokumentáció – Stabil Béta Verzió (v0.5.0-beta)**  
> **Célintézmény:** Siófoki Müller's vendégházak (Fő utca 104-106, Kálmán Imre sétány 9, Fő utca 114)  
> **Célközönség:** Egyéni szállóvendégek, családok és iskolai osztálykirándulások  
> **Projekt Állapot:** Stabil Béta (aktív fejlesztés és tesztelés alatt)

---

## 📖 1. Projekt Áttekintés

A **SioGuide** egy korszerű, **Agentic RAG** (*Retrieval-Augmented Generation* és *Autonomous Function Calling*) architektúrára épülő intelligens webes asszisztens. Célja, hogy a siófoki Müller's vendégházak vendégeinek valós idejű, pontos, helyi információkat és exkluzív kedvezményeket nyújtson:

- **Hiteles Szállás- és Programinformáció:** Részletes adatok a Müller's 3 egységéről, a strandokról, éttermekről, kulturális és wellness lehetőségekről.
- **Agentic AI & Google Maps Eszközhasználat:** A Gemini 3.8 Flash autonóm módon hívja meg a Google Maps Distance Matrix API-t, hogy valós idejű gyalogos távolságokat, sétaidőket és többállomásos menetterveket kalkuláljon.
- **Müller's Partnerkedvezmények:** A RAG adatbázisba ágyazott kedvezmények (pl. Pietro Pizzeria 15%, Palace Wellness 20%, Escape60 15%) automatikus beépítése a válaszokba és kiemelése a felületen.
- **Időjárás- és Napszak-érzékeny Logika:** Élő Open-Meteo időjárási adatok (hőmérséklet, WMO esőkódok) és óra-alapú napszak-szabályok alapján esős napokon beltéri programokat, este pedig vacsorát és szórakozóhelyeket javasol.
- **Interaktív Forrásmegjelölés & Google Térkép Modal:** A válaszokhoz tartozó forráskártyákra kattintva felugró modális ablakban közvetlenül beágyazott interaktív Google Térkép (Embed API) és kedvezmény-érvényesítési útmutató jelenik meg.

---

## 🏛️ 2. Rendszerarchitektúra és Agentic Adatfolyam

```
+-------------------------------------------------------------------------------------------------+
|                                         REACT FRONTEND                                          |
|  - Vite + Tailwind CSS · Egyoldalas Chat Alkalmazás (SPA)                                       |
|  - Kattintható forráskártyák (SourceCard) animált 🎁 Müller's Kedvezmény badge-ekkel            |
|  - Interaktív PlaceModal beágyazott Google Maps Embed API-val (iframe)                          |
+------------------------------------------------+------------------------------------------------+
                                                 |
                                                 | HTTP POST /ask { question }
                                                 v
+-------------------------------------------------------------------------------------------------+
|                                        FASTAPI BACKEND                                          |
|                                                                                                 |
|  1. Meteorológiai és Idő Kontextus:                                                             |
|     --> Open-Meteo REST API (hőmérséklet, WMO kód) + datetime napszak elemzés                   |
|                                                                                                 |
|  2. Beágyazás (Embedding):                                                                      |
|     --> Google Gemini gemini-embedding-001 (768 dimenzió, RETRIEVAL_QUERY)                      |
|                                                                                                 |
|  3. Vektorkeresés (Retrieval):                                                                  |
|     --> Supabase pgvector RPC (match_locations) HNSW indexeléssel                               |
|     --> Helyszínek + discount_info partnerkedvezmények kiolvasása                               |
|                                                                                                 |
|  4. Agentic AI Chat & Function Calling (Generation):                                            |
|     --> Google Gemini 3.8 Flash (chats.create + automatic_function_calling)                     |
|     --> Szükség esetén automatikus Google Maps Distance Matrix API hívás                        |
|         [get_walking_distance(origin, destination)] -> távolság, menetidő, többállomásos tervek |
+-------------------------------+-----------------------------------------------+-----------------+
                                |                                               |
                                v                                               v
+-----------------------------------------------+   +---------------------------------------------+
|                SUPABASE CLOUD                 |   |             KÜLSŐ SZOLGÁLTATÁSOK            |
|  - PostgreSQL 17 + pgvector                   |   |  - Google Gemini API:                       |
|  - locations tábla (embedding: vector(768),   |   |      * gemini-embedding-001 (768 dim)       |
|    discount_info: text)                       |   |      * gemini-3.8-flash (Function Calling)  |
|  - HNSW koszinusz távolság index              |   |  - Google Maps Distance Matrix API          |
|  - match_locations() tárolt eljárás           |   |  - Google Maps Embed API (Frontend iframe)  |
|                                               |   |  - Open-Meteo Weather API (ingyenes)        |
+-----------------------------------------------+   +---------------------------------------------+
```

---

## 🛠️ 3. Alkalmazott Technológiák és Könyvtárak

| Réteg | Technológia / Szolgáltatás | Szerep a rendszerben |
|---|---|---|
| **Adatbázis** | **Supabase (PostgreSQL 17)** | Felhőalapú perzisztencia, RLS biztonsági házirendek |
| **Vektorkeresés** | **pgvector + HNSW index** | 768 dimenziós gyors és pontos koszinusz-hasonlósági keresés |
| **Backend Keretrendszer** | **FastAPI (Python 3.11+)** | Aszinkron REST API, OpenAPI/Swagger dokumentációval |
| **Agentic AI & LLM** | **Google Gemini `gemini-3.8-flash`** | Szövegértés, többállomásos útvonal-tervezés és automatikus Function Calling |
| **Szövegvektorizálás** | **Google Gemini `gemini-embedding-001`** | 768 dimenzióra optimalizált szemantikus beágyazás |
| **Távolságmérés Tool** | **Google Maps Distance Matrix API** | Gyalogos távolságok és menetidők lekérdezése Siófokon |
| **Interaktív Térkép** | **Google Maps Embed API** | Helyszínek beágyazott interaktív térképes megjelenítése |
| **Időjárás Szolgáltatás** | **Open-Meteo API** | Valós idejű siófoki hőmérséklet és csapadékadatok kulcs nélkül |
| **Frontend Keretrendszer** | **React 19 + Vite** | Nagy sebességű SPA, modern React Hooks és állapotkezelés |
| **Design & Stílus** | **Tailwind CSS v3** | Reszponzív, balatoni kék színvilágú modern UI |

---

## 📁 4. Könyvtárstruktúra

```
SioGuide/
├── .env                        # Központi környezeti változók (DB URI, Gemini és Maps API kulcsok)
├── .gitignore                  # Git figyelmen kívül hagyási szabályok
├── DEVELOPMENT_LOG.md          # Fázisonkénti részletes fejlesztési napló
├── PROJECT_BOARD.md            # Projekt feladatkövető tábla és Roadmap
├── README.md                   # Részletes egyetemi dokumentáció
│
├── backend/                    # FastAPI Backend alkalmazás
│   ├── config.py               # Pydantic Settings konfigurációkezelő (.env betöltése)
│   ├── main.py                 # FastAPI szerver, Google Maps Tool és Agentic RAG pipeline
│   ├── requirements.txt        # Python függőségek listája
│   ├── seed.py                 # 17 siófoki helyszínt és kedvezményeket feltöltő szkript
│   └── test_rpc.py             # Izolált pgvector és RPC integrációs tesztszkript
│
└── frontend/                   # React Frontend alkalmazás (Vite)
    ├── .env                    # Frontend környezeti változók (VITE_API_URL, Maps API key)
    ├── index.html              # HTML belépési pont
    ├── package.json            # Node.js függőségek és scriptek
    ├── tailwind.config.js      # Egyedi balatoni színpaletta konfiguráció
    ├── vite.config.js          # Vite build beállítások
    └── src/
        ├── App.jsx             # Fő Chat felület, állapotkezelés és Modal renderelés
        ├── main.jsx            # React root inicializálás
        ├── index.css           # Globális Tailwind direktívák és animációk
        └── components/
            ├── ChatMessage.jsx # Felhasználói és asszisztens buborékok markdown formázással
            ├── LoadingDots.jsx # Aszinkron várakozási animáció
            ├── PlaceModal.jsx  # Felugró modal Google Maps Embed térképpel és kedvezményekkel
            └── SourceCard.jsx  # Kattintható forráskártyák 🎁 Müller's Kedvezmény badge-dzsel
```

---

## 🗄️ 5. Adatbázis Séma és Tárolt Eljárás (Supabase DDL)

A `locations` tábla tárolja a helyszíneket, a 768 dimenziós beágyazásokat és a partnerkedvezményeket:

```sql
-- 1. pgvector kiterjesztés aktiválása
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. locations tábla létrehozása
CREATE TABLE IF NOT EXISTS public.locations (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text        NOT NULL,
  description   text        NOT NULL,
  category      text        NOT NULL,
  discount_info text        DEFAULT NULL,
  embedding     vector(768),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. HNSW vektorindex létrehozása (garantálja a gyors és pontos koszinusz keresést)
CREATE INDEX IF NOT EXISTS locations_embedding_hnsw_idx 
  ON public.locations 
  USING hnsw (embedding vector_cosine_ops);

-- 4. RLS és olvasási jogosultság
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read locations"
  ON public.locations FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. match_locations tárolt eljárás (RPC)
CREATE OR REPLACE FUNCTION public.match_locations(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.3,
  match_count     integer          DEFAULT 5
)
RETURNS TABLE (
  id            bigint,
  name          text,
  description   text,
  category      text,
  discount_info text,
  similarity    double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.name,
    l.description,
    l.category,
    l.discount_info,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM locations l
  WHERE 1 - (l.embedding <=> query_embedding) >= match_threshold
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## ⚙️ 6. Környezeti Változók és Beállítás

A rendszer működéséhez két külön `.env` konfiguráció szükséges:

### 1. Központi `.env` (a projekt gyökérkönyvtárában):
```env
# Supabase hitelesítés
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>

# Google Gemini API (Beágyazások és Chat LLM)
GEMINI_API_KEY=AIzaSy...

# Google Maps API (Distance Matrix API a backend tool calling-hoz)
GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 2. Frontend `.env` (`frontend/.env`):
```env
# Backend API elérési út
VITE_API_URL=http://localhost:8000

# Google Maps Embed API kulcs az interaktív iframe megjelenítéséhez
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## 🚀 7. Telepítési és Indítási Útmutató

### 1. Backend elindítása
```bash
# Virtuális környezet aktiválása
python3 -m venv venv
source venv/bin/activate       # macOS / Linux
# venv\Scripts\activate        # Windows

# Függőségek telepítése
cd backend
pip install -r requirements.txt

# Adatbázis feltöltése 17 siófoki helyszínnel és kedvezményekkel
python seed.py

# FastAPI szerver indítása
uvicorn main:app --reload --port 8000
```
- **Backend API:** `http://localhost:8000`
- **Interaktív Swagger UI:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

### 2. Frontend elindítása
Egy külön terminálablakban:
```bash
cd frontend
npm install
npm run dev
```
- **Webes felület:** `http://localhost:5173`

---

## 💡 8. Agentic Funkciók és Üzleti Logika

### 🧠 1. Autonóm Google Maps Function Calling
A backend a Google GenAI legfrissebb Chat API-ját használja (`automatic_function_calling=True`). Amikor a vendég távolságra, menetidőre vagy többállomásos útitervre kérdez rá:
1. A Gemini felismeri a szándékot, és autonóm módon meghívja a `get_walking_distance(origin, destination)` Python eszközt.
2. A függvény a Google Maps Distance Matrix API-n keresztül kiszámolja a valós siófoki gyalogos távolságot és menetidőt.
3. A nyelvi modell az eredményt természetes magyar szövegben formázva építi be a válaszba.

### 🎁 2. RAG-ba Ágyazott Müller's Partnerkedvezmények
A `seed.py` a beágyazás során a kedvezmények szövegét is vektorizálja. Ha a vendég akciókra, olcsóbb étkezésre vagy wellnessre kérdez, a rendszer automatikusan a partnerhelyeket hozza fel elsőként:
- 🍕 **Pietro Ristorante & Pizzeria:** 15% kedvezmény minden pizzára és tésztára szobakulccsal.
- 💆 **Palace Wellness & Spa:** 20% kedvezmény az egész napos wellness belépőből és ingyenes szauna.
- 🍔 **Renegát Pub & Burger:** Ajándék kézműves szörp vagy pohár sör minden burger menühöz.
- 🧩 **Escape60 Szabadulószoba:** 15% csoportos kedvezmény osztálykirándulóknak és Müller's vendégeknek.
- 🏄 **Siófoki Vízisport Centrum:** 1 óra SUP/vízibicikli bérlés mellé +30 perc ajándék.
- 🎉 **Flört Club:** Éjfélig ingyenes belépés vendégkártyával.

### 🗺️ 3. Interaktív PlaceModal és Térkép Iframe
A chat alatt listázott forráskártyákra kattintva egy Tailwind-del formázott modális ablak ugrik fel:
- Részletes leírás és százalékos egyezés.
- Kiemelt arany doboz a kedvezmény pontos beváltási instrukciójával.
- Helyszínre fókuszált **interaktív Google Térkép iframe** (Embed API).
- Közvetlen *"Útvonaltervezés"* gomb, amely a natív Google Térképre navigál.

---

## 🔮 9. Fázis 6: Továbbfejlesztési Roadmap (Ötlettár)

A projekt jelenleg stabil Béta állapotban van. A jövőbeli fejlesztési irányok:

- [ ] **Fázis 6.1: Élő BAHART hajómenetrend integráció** – A siófoki kikötő menetrendszerű járatainak dinamikus lekérdezése (Balatonfüred, Tihany).
- [ ] **Fázis 6.2: Többnyelvű asszisztens (HU / EN / DE)** – Külföldi turisták és diákok kiszolgálása automatikus nyelvfelismeréssel.
- [ ] **Fázis 6.3: Hangalapú asszisztens (Voice AI)** – Web Speech API / Whisper alapú beszédbevitel és hangos felolvasás a kényelmes strandolás közbeni használathoz.
- [ ] **Fázis 6.4: Müller's Szobafoglalási és Reggeli űrlap** – Közvetlen foglalási igények és reggeli-rendelések leadása a chaten keresztül.
- [ ] **Fázis 6.5: Offline PWA támogatás** – Mobilra telepíthető webalkalmazás helyi gyorsítótárral hálózati kimaradás esetére.

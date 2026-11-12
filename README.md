# SioGuide 🌊 – RAG-alapú Intelligens Turisztikai és Szállás-asszisztens

> **Egyetemi Projekt Dokumentáció**  
> **Célintézmény:** Siófoki Müller's vendégházak (Fő utca 104-106, Kálmán Imre sétány 9, Fő utca 114)  
> **Célközönség:** Egyéni szállóvendégek, családok és iskolai osztálykirándulások  

---

## 📖 1. Projekt Áttekintés

A **SioGuide** egy modern, **RAG** (*Retrieval-Augmented Generation*) architektúrára épülő intelligens webes asszisztens. Célja, hogy a siófoki Müller's vendégházakba érkező vendégeknek releváns, hiteles és kontextusfüggő segítséget nyújtson:
- Információk a vendégházak szolgáltatásairól, felszereltségéről és elhelyezkedéséről.
- Személyre szabott programajánlók strandokról, éttermekről, kulturális és szórakozási lehetőségekről.
- **Időjárás- és napszak-érzékeny ajánlások**: integrált élő időjárás-előrejelzés (Open-Meteo) és dinamikus napszak-logika alapján rossz időben beltéri alternatívákat, este pedig vacsora- és szórakozóhelyeket javasol.
- **Átlátható forrásmegjelölés**: minden válasz alatt megjeleníti a felhasznált hiteles helyszíneket hasonlósági pontszámmal és kategóriákkal.

---

## 🏛️ 2. Rendszerarchitektúra és Adatfolyam

```
+-----------------------------------------------------------------------------------+
|                                 REACT FRONTEND                                    |
|   Vite + Tailwind CSS · Chat UI · Forrásmegjelölő kártyák · Reszponzív felület    |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | HTTP POST /ask (JSON)
                                          v
+-----------------------------------------------------------------------------------+
|                               FASTAPI BACKEND                                     |
|                                                                                   |
|  1. Időjárás és Idő Lekérés:                                                     |
|     --> Open-Meteo API (hőmérséklet, WMO kód) + Python datetime (napszak logika)  |
|                                                                                   |
|  2. Vektorizálás:                                                                |
|     --> Google Gemini Embedding (gemini-embedding-001, 768 dimenzió)              |
|                                                                                   |
|  3. Visszakeresés (Retrieval):                                                   |
|     --> Supabase pgvector RPC (match_locations) HNSW indexeléssel                |
|                                                                                   |
|  4. Válaszgenerálás (Generation):                                                |
|     --> Google Gemini 3.8 Flash (kontextus, időjárás, prompt szabályok)           |
+---------------------+---------------------------------------+---------------------+
                      |                                       |
                      v                                       v
+-----------------------------------+   +-------------------------------------------+
|          SUPABASE CLOUD           |   |            KÜLSŐ SZOLGÁLTATÁSOK           |
|  - PostgreSQL 17 + pgvector       |   |  - Google Gemini API:                     |
|  - locations tábla (vector(768))  |   |      * gemini-embedding-001 (768 dim)     |
|  - HNSW koszinusz-index           |   |      * gemini-3.8-flash                   |
|  - match_locations() tárolt eljárás |  - Open-Meteo Forecast API (szabad hozzáférés) |
+-----------------------------------+   +-------------------------------------------+
```

---

## 🛠️ 3. Alkalmazott Technológiák

| Réteg | Technológia | Szerep a projektben |
|---|---|---|
| **Adatbázis** | **Supabase (PostgreSQL 17)** | Felhőalapú relációs adatbázis RLS védelemmel |
| **Vektorkeresés** | **pgvector kiterjesztés + HNSW index** | 768 dimenziós koszinusz-távolság alapú szemantikus keresés |
| **Backend** | **FastAPI (Python 3.11+)** | Aszinkron, nagy teljesítményű REST API |
| **Beágyazás (Embedding)** | **Google Gemini `gemini-embedding-001`** | 768 dimenzióra optimalizált szövegvektorizálás |
| **Nagy Nyelvi Modell (LLM)** | **Google Gemini `gemini-3.8-flash`** | Szöveggenerálás, prompt guardrails és kontextusfeldolgozás |
| **Időjárás API** | **Open-Meteo REST API** | Élő siófoki meteorológiai adatok lekérése kulcs nélkül |
| **Frontend** | **React 19 + Vite** | Komponens-alapú egyoldalas webalkalmazás (SPA) |
| **Stílus és UI** | **Tailwind CSS v3** | Balatoni hangulatú, modern és reszponzív felület |

---

## 📁 4. Könyvtárstruktúra

```
SioGuide/
├── .env                        # Központi környezeti változók (API kulcsok, DB URI)
├── .gitignore                  # Git figyelmen kívül hagyási szabályok
├── DEVELOPMENT_LOG.md          # Részletes fázisonkénti fejlesztési napló
├── PROJECT_BOARD.md            # Projekt feladatkövető tábla (Roadmap)
├── README.md                   # Ez a dokumentáció
│
├── backend/                    # FastAPI Backend alkalmazás
│   ├── config.py               # Pydantic Settings alapú konfigurációkezelő
│   ├── main.py                 # FastAPI szerver, végpontok és RAG pipeline
│   ├── requirements.txt        # Python függőségek listája
│   ├── seed.py                 # Adatfeltöltő szkript a Supabase adatbázishoz
│   └── test_rpc.py             # Izolált tesztszkript az RPC és vektorkeresés ellenőrzésére
│
└── frontend/                   # React Frontend alkalmazás (Vite)
    ├── .env                    # Frontend környezeti változó (VITE_API_URL)
    ├── index.html              # HTML belépési pont
    ├── package.json            # Node.js függőségek és scriptek
    ├── tailwind.config.js      # Tailwind CSS konfiguráció
    ├── vite.config.js          # Vite konfiguráció
    └── src/
        ├── App.jsx             # Fő Chat komponens és állapotkezelés
        ├── main.jsx            # React root inicializálás
        ├── index.css           # Globális stílusok és animációk
        └── components/
            ├── ChatMessage.jsx # Felhasználói és asszisztens üzenetbuborékok
            ├── LoadingDots.jsx # Aszinkron várakozási animáció
            └── SourceCard.jsx  # Forrásmegjelölő kártya hasonlósági mutatóval
```

---

## 🗄️ 5. Adatbázis Séma és Tárolt Eljárás

A Supabase adatbázisban a `locations` tábla tárolja a helyszíneket a leírásukból generált 768 dimenziós vektorokkal:

```sql
-- 1. pgvector kiterjesztés aktiválása
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. locations tábla létrehozása
CREATE TABLE IF NOT EXISTS public.locations (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text        NOT NULL,
  description text        NOT NULL,
  category    text        NOT NULL,
  embedding   vector(768),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. HNSW vektorindex létrehozása a pontos és gyors koszinusz-kereséshez
CREATE INDEX IF NOT EXISTS locations_embedding_hnsw_idx 
  ON public.locations 
  USING hnsw (embedding vector_cosine_ops);

-- 4. RLS és jogosultságok
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read locations"
  ON public.locations FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Hasonlósági kereső tárolt eljárás (RPC)
CREATE OR REPLACE FUNCTION public.match_locations(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.3,
  match_count     int   DEFAULT 5
)
RETURNS TABLE (
  id          bigint,
  name        text,
  description text,
  category    text,
  similarity  float
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT
    l.id,
    l.name,
    l.description,
    l.category,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM locations l
  WHERE 1 - (l.embedding <=> query_embedding) >= match_threshold
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## ⚙️ 6. Telepítés és Helyi Futtatás

### Előfeltételek
- **Python 3.11+**
- **Node.js 18+** és `npm`
- **Supabase** projekt (aktív pgvector kiterjesztéssel)
- **Google Gemini API kulcs**

### 1. Környezeti változók beállítása
Hozd létre a gyökérkönyvtárban a `.env` fájlt:
```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

A `frontend/.env` fájl tartalma:
```env
VITE_API_URL=http://localhost:8000
```

### 2. Backend beüzemelése
```bash
# Virtuális környezet létrehozása és aktiválása
python3 -m venv venv
source venv/bin/activate       # macOS / Linux
# venv\Scripts\activate        # Windows

# Függőségek telepítése
cd backend
pip install -r requirements.txt

# Adatbázis feltöltése kezdőadatokkal (17 siófoki helyszín)
python seed.py

# FastAPI szerver indítása fejlesztői módban
uvicorn main:app --reload --port 8000
```
- **Backend API:** `http://localhost:8000`
- **Swagger / OpenAPI Dokumentáció:** `http://localhost:8000/docs`
- **Egészségügyi ellenőrzés:** `http://localhost:8000/health`

### 3. Frontend beüzemelése
Egy új terminálablakban:
```bash
cd frontend
npm install
npm run dev
```
- **Webes felület:** `http://localhost:5173`

---

## 📡 7. API Végpontok

### `GET /health`
Rendszer állapotának és verziójának lekérdezése (monitoring, CI/CD számára).
- **Válasz:** `{"status": "ok", "service": "SioGuide API", "version": "0.3.0"}`

### `POST /ask`
RAG-alapú kérdés-válasz végpont.
- **Kérés:**
  ```json
  {
    "question": "Milyen beltéri programot ajánlasz ma estére a Müller's vendégház közelében?"
  }
  ```
- **Válasz:**
  ```json
  {
    "answer": "Mivel jelenleg este van és hűvösebb az idő, kiváló választás lehet a Palace Wellness & Spa vagy a közeli Escape60 Szabadulószoba...",
    "sources": [
      {
        "id": 9,
        "name": "Palace Wellness & Spa",
        "description": "Fedett wellness részleg Siófokon: medence, szauna, masszázs...",
        "category": "wellness / beltéri program",
        "similarity": 0.78
      },
      {
        "id": 1,
        "name": "Müller's Vendégház – Fő utca 104-106",
        "description": "Központi elhelyezkedésű szálláshely...",
        "category": "szállás",
        "similarity": 0.76
      }
    ]
  }
  ```

---

## 🧠 8. RAG Prompt és Kontextus Logika

A rendszer nem pusztán statikus adatbázis-találatokat ad át a nyelvi modellnek, hanem több rétegű kontextust épít:

1. **Időjárási réteg (Open-Meteo):** Az API lekéri a valós idejű siófoki hőmérsékletet és az aktuális WMO időjárási kódot (pl. eső, napos, borult).
2. **Idő- és napszak-érzékenység:** A prompt az óra szerint négy kategóriára bontja a javaslatokat (reggel: kávézók/reggeli; délután: strand/kirándulás; este: vacsora/bárok; éjszaka: éjjeli nyitvatartás).
3. **Guardrails & Hallucináció-védelem:** A modell szigorú rendszerutasítást kap, hogy kizárólag a kapott forráshelyszínekre támaszkodjon, és udvariasan utasítsa el az irreleváns vagy nem siófoki témákat.
4. **Hitelesség ellenőrzése:** A válaszban felhasznált helyszínek a frontend felületen színkódolt, interaktív kártyákon jelennek meg, megmutatva a szemantikus hasonlóság százalékos értékét.

---

## 🏆 9. Fejlesztési Mérföldkövek és Eredmények

- ✅ Sikeres adatbázis-migráció 1536 dimenzióról (OpenAI) 768 dimenzióra (Gemini).
- ✅ Hiba-izoláció és megoldás: az IVFFlat kis elemszámú torzításának megszüntetése HNSW indexeléssel.
- ✅ Teljesen aszinkron és hibatűrő időjárás-kezelés (időjárási hiba esetén sem áll le a RAG keresés).
- ✅ Letisztult, reszponzív felület forrásmegjelöléssel.

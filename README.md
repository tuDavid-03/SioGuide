# SioGuide – Müller's AI Concierge

> **Agentic RAG alapú, többnyelvű, hangvezérelt turisztikai asszisztens és Progresszív Webalkalmazás (PWA) a Balaton partján**  
> *Kifejezetten a siófoki Müller's vendégházak vendégei számára tervezve*  
> **Hivatalos Egyetemi Projekt Dokumentáció (Production-Ready Release)**

[![React](https://img.shields.io/badge/React-19.x-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E.svg?logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_GenAI-Gemini_Flash-8E75B2.svg?logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Telepíthető-purple.svg?logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

## 🌐 Élő Demó (Live Deployment)

A rendszer éles felhőalapú környezetben üzemel, és azonnal kipróbálható az alábbi linkeken:

- **Frontend Webalkalmazás (Vercel):** [https://sio-guide.vercel.app](https://sio-guide.vercel.app)
- **Backend REST API Szerver (Render):** [https://sioguide-backend.onrender.com](https://sioguide-backend.onrender.com)
- **Interaktív OpenAPI / Swagger Dokumentáció:** [https://sioguide-backend.onrender.com/docs](https://sioguide-backend.onrender.com/docs)
- **Rendszer Életjel (Health Check):** [https://sioguide-backend.onrender.com/health](https://sioguide-backend.onrender.com/health)

---

## 📖 1. Projekt Áttekintés

A **SioGuide** egy korszerű, **Agentic RAG** (*Retrieval-Augmented Generation* és *Autonomous Tool Calling*) architektúrára épülő intelligens turisztikai és szálláshely-asszisztens, amely a siófoki **Müller's vendégházak** (Fő utca 104-106., Kálmán Imre sétány 9., Fő utca 114.) vendégei, családok és iskolai osztálykirándulások számára nyújt 0-24 órás digitális concierge szolgáltatást.

A rendszer a statikus chatbotokon messze túlmutatva valós idejű, többforrású adatbázis-vektorkeresést, autonóm külső eszközhasználatot (Google Maps Distance Matrix), interaktív kosár-alapú útvonaltervezést, natív böngészős hangfelismerést és mobilra telepíthető PWA élményt ötvöz egyetlen integrált platformban.

---

## 🏛️ 2. Rendszerarchitektúra és Adatfolyam

```
+-------------------------------------------------------------------------------------------------+
|                                    REACT PWA KLIENS (FRONTEND)                                  |
|  - Progresszív Webalkalmazás (React 19 + Vite 6 + Tailwind CSS · Standalone SPA)               |
|  - Web Speech API (Hangalapú kérdésfeltevés dinamikus mikrofon-pulzálással)                    |
|  - Útiterv-Kosár (Trip Cart): Helyszínek interaktív gyűjtése & automatikus prompt Checkout     |
|  - Kattintható SourceCard kártyák és PlaceModal beágyazott interaktív Google Maps iframe-mel    |
|  - LocalStorage mentéskezelő és natív Web Share API (navigator.share) azonnali megosztás       |
+------------------------------------------------+------------------------------------------------+
                                                 |
                                                 | HTTP POST /ask { question: string }
                                                 v
+-------------------------------------------------------------------------------------------------+
|                                    FASTAPI AGENTIC BACKEND                                      |
|                                                                                                 |
|  1. Környezeti és Meteorológiai Kontextus:                                                      |
|     --> Open-Meteo REST API (Siófoki élő hőmérséklet & WMO időjáráskód) + Napszak-elemzés      |
|                                                                                                 |
|  2. Szemantikus Vektor-beágyazás (Embedding):                                                   |
|     --> Google GenAI gemini-embedding-001 (768 dimenziós vektorok)                              |
|                                                                                                 |
|  3. Vektor-hasonlósági Visszakeresés (Retrieval):                                               |
|     --> Supabase PostgreSQL 17 (pgvector bővítmény + HNSW koszinusz távolság index)             |
|     --> match_locations tárolt eljárás: Helyszínek, árak, kapcsolat és Müller's kedvezmények   |
|                                                                                                 |
|  4. Agentic Chat & Autonóm Eszközhasználat (Tool Calling):                                      |
|     --> Google Gemini 3.8 / 1.5 Flash modell automatikus Function Calling támogatással          |
|     --> Tool: get_walking_distance(origin, destination) a Google Maps Distance Matrix API-val  |
|     --> Többállomásos útiterv szintézis kattintható Google Maps útvonaltervező linkkel         |
+-------------------------------+-----------------------------------------------+-----------------+
                                |                                               |
                                v                                               v
+-----------------------------------------------+   +---------------------------------------------+
|                SUPABASE CLOUD                 |   |             KÜLSŐ SZOLGÁLTATÁSOK            |
|  - PostgreSQL 17 + pgvector bővítmény         |   |  - Google Gemini API                        |
|  - locations tábla (embedding: vector(768))   |   |  - Google Maps Distance Matrix API (Tool)   |
|  - HNSW vector_cosine_ops index               |   |  - Google Maps Embed API (Frontend Térkép)  |
|  - match_locations() tárolt eljárás           |   |  - Open-Meteo Weather API                   |
+-----------------------------------------------+   +---------------------------------------------+
```

---

## ✨ 3. Főbb Rendszerfunkciók (Key Features)

### 1. 🤖 Agentic AI & Autonóm Google Maps Eszközhasználat (Tool Calling)
- A legújabb `google-genai` SDK-ra épülő **Google Gemini Flash** modellt használja natív **Function Calling** mechanizmussal.
- Amennyiben a vendég gyalogos távolságról, sétaidőről érdeklődik, vagy a vendégház és a célpontok közötti útvonalat kérdezi, a modell autonóm módon meghívja a háttérben futó `get_walking_distance` Python eszközt a **Google Maps Distance Matrix API**-n keresztül.
- Komplex, többállomásos menettervek esetén a válasz legvégén szigorúan legenerál egy azonnal kattintható, összefűzött Google Maps útvonaltervező linket:
  `https://www.google.com/maps/dir/Indulási+cím/1.+állomás+neve+Siófok/2.+állomás+neve+Siófok`

### 2. 🎁 Domén-specifikus RAG & Exkluzív Müller's Kedvezmények
- **23 gondosan feltöltött siófoki helyszín** (a Müller's 3 vendégháza, strandok, minőségi éttermek, éjszakai klubok, wellness létesítmények, vitorláskikötők, szabadulószobák).
- A vektorok a **PostgreSQL 17 pgvector** bővítményében tárolódnak, dedikált **HNSW koszinusz-távolság indexeléssel** a gyors és pontos keresésért.
- A rendszer közvetlenül a RAG kontextusból kiemeli a Müller's szállóvendégeknek járó exkluzív partnerkedvezményeket (10–20% kedvezmény éttermekben, wellness belépőknél és szórakozóhelyeken), és ezeket animált jelvényekkel jeleníti meg.
- Tájékoztatást ad a valós árfekvésről (*pl. 'Főételek: 3500-6000 Ft'*) és a közvetlen asztalfoglalási telefonszámokról.

### 3. 🛒 Útiterv-Kosár (Trip Cart – Kollaboratív Tervező)
- A forráskártyákon elhelyezett **`➕ Tervhez`** gomb segítségével a vendégek egyszerűen összeválogathatják a meglátogatni kívánt helyszíneket.
- **Kétirányú Toggle funkció:** A gomb állapota a kosárba helyezéskor azonnal átvált zöld **`✓ Hozzáadva`** állapotra, egérráhúzáskor (hover) pedig egy feltűnő **`❌ Eltávolítás`** opciót kínál, így a lista egyetlen kattintással módosítható.
- Kosárba gyűjtött elemek esetén megjelenik egy lebegő **Checkout sáv**:
  - Mutatja a kiválasztott helyek számát és neveit.
  - Egyetlen kattintásra (`🗺️ Terv Generálása`) elküldi az optimalizált lekérdezést: *"Szeretnék egy optimalizált programtervet az alábbi helyszínekből: [...]. Kérlek, oszd be logikusan, számolj a sétaidőkkel, és a végén adj egy kattintható Maps linket!"*.

### 4. 💾 Helyi Mentés (LocalStorage) & Natív Web Share API
- **Intelligens Mentés Gomb:** Csak akkor jelenik meg az AI válaszai alatt, ha a szöveg valós útvonalat vagy programtervet tartalmaz (a rövid válaszoknál és üdvözléseknél rejtve marad).
- **CustomEvent Állapotszinkronizáció:** Ha a mentett tervek modális ablakában törölnek egy tervet, a rendszer egy `planDeleted` eseményt bocsát ki, azonnal visszaállítva az adott chat üzenet alatti mentés gombot.
- **Azonnali Megosztás a Chatből:** A mentett tervek és az aktív chat válaszai is egy kattintással megoszthatók a natív mobil megosztó ablakon (`navigator.share`) keresztül (WhatsApp, Messenger, SMS), asztali böngészőben pedig automatikus vágólapra másolási fallbackkel (`✓ Kimásolva!`).
- Egységesített professzionális fejléc és vízjel formátum:
  ```text
  📍 SioGuide Programterv - Siófok:
  [A generált útiterv szövege és a kattintható Maps link]

  Készült a SioGuide Müller's AI Asszisztenssel.
  ```

### 5. 🎙️ Hangvezérlés (Web Speech API)
- Böngésző-natív `window.SpeechRecognition` alapú beszédfelismerés külső fizetős hang API-k nélkül.
- Automatikusan adaptálódik a felület aktív nyelvéhez (`hu-HU`, `de-DE`, `en-US`).
- Vizuális visszajelzésként egy pulzáló, piros hullámzó állapotjelző sáv tájékoztat a diktálásról.

### 6. 🌍 Automatikus Nyelvfelismerés (Auto-I18n) & Splash Screen
- Indításkor a böngésző beállításai alapján a `navigator.language` segítségével azonosítja a nyelvet:
  - `hu` $\rightarrow$ Magyar
  - `de` $\rightarrow$ Német
  - minden más $\rightarrow$ Angol (`en` alapértelmezett)
- A fejlécben elhelyezett interaktív gyorsváltóval (`HU` | `EN` | `DE`) a teljes szótár és az üdvözlő üzenet azonnal átkapcsolható.
- **Gombmentes Balatoni Splash Screen:** Letisztult nyitóképernyő a hivatalos SioGuide logóval és nyelvhű alcímmel, amely 1.6 másodperc után finom fade-out animációval automatikusan átadja a helyét a chatnek.

### 7. 📱 Progresszív Webalkalmazás (PWA)
- A `vite-plugin-pwa` integrációnak köszönhetően mobilra (iOS Safari, Android Chrome) és asztali számítógépre is önálló applikációként telepíthető.
- Automatikus Service Worker precache gyorsítótárazás (`dist/sw.js`) az azonnali betöltődéshez.
- Mobil-optimalizált viewport, safe-area alsó térközkezelés és nagyfelbontású saját ikonok (`pwa-192x192.png`, `pwa-512x512.png`).

---

## 🛠️ 4. Alkalmazott Technológiai Stack

| Réteg | Technológia | Szerep és Feladatkör |
|---|---|---|
| **Frontend Keretrendszer** | **React 19** + **Vite 6** | Nagy sebességű Single Page Application (SPA), React Hooks alapú állapotkezelés |
| **Design & Felület** | **Tailwind CSS v3** | Reszponzív, mobil-elsődleges Balaton-kék design paletta |
| **PWA Motor** | **vite-plugin-pwa** | Service Worker regisztráció, Web App Manifest és offline gyorsítótárazás |
| **Beszédfelismerés** | **Web Speech API** | Natív böngészős hangalapú diktálás külső könyvtár nélkül |
| **Backend Keretrendszer** | **FastAPI** + **Uvicorn** | Aszinkron Python REST API, automatikus Pydantic adatvalidációval |
| **Adatbázis & Vektorkeresés** | **Supabase (PostgreSQL 17)** | Felhőalapú perzisztencia, `pgvector` kiterjesztés és HNSW koszinusz index |
| **Generatív AI LLM** | **Google Gemini 3.8 / 1.5 Flash** | Szövegértelmezés, többnyelvű válaszadás és autonóm Function Calling |
| **Szövegbeágyazó Modell** | **Google gemini-embedding-001** | 768 dimenziós szemantikus vektorreprezentáció generálása |
| **Térkép és Útvonaltervezés** | **Google Maps Platform** | Distance Matrix API (Backend Tool) + Embed API (Frontend modal iframe) |
| **Időjárás Szolgáltatás** | **Open-Meteo REST API** | Élő siófoki hőmérséklet és csapadékadatok lekérdezése |

---

## 📁 5. Projekt Könyvtárstruktúra

```
SioGuide/
├── .env                        # Központi környezeti változók (API kulcsok, DB elérések)
├── DEVELOPMENT_LOG.md          # Fázisonkénti részletes fejlesztési napló
├── PROJECT_BOARD.md            # Projekt feladatkövető tábla és roadmap
├── README.md                   # Hivatalos egyetemi projekt dokumentáció (ez a fájl)
│
├── backend/                    # FastAPI Backend Alkalmazás
│   ├── config.py               # Pydantic Settings konfigurációkezelő (.env betöltése)
│   ├── main.py                 # FastAPI szerver, Agentic RAG pipeline & Google Maps tool
│   ├── requirements.txt        # Python backend függőségek listája
│   ├── seed.py                 # 23 siófoki helyszínt, árat és kedvezményt feltöltő szkript
│   └── test_rpc.py             # Izolált pgvector RPC integrációs tesztszkript
│
└── frontend/                   # React PWA Frontend Alkalmazás
    ├── index.html              # HTML belépési pont mobil PWA meta tagekkel
    ├── package.json            # Node.js függőségek (React, Vite, PWA plugin)
    ├── vite.config.js          # Vite konfiguráció VitePWA pluginnal és web manifesttel
    ├── tailwind.config.js      # Tailwind CSS konfiguráció a custom lake színpalettával
    │
    ├── public/                 # Statikus média és ikonok
    │   ├── pwa-192x192.png     # Hivatalos SioGuide PWA alkalmazásikon
    │   └── pwa-512x512.png     # Nagy felbontású Splash és Store ikon
    │
    └── src/                    # React Forráskód
        ├── main.jsx            # Alkalmazás belépési pont
        ├── App.jsx             # Fő vezérlő (Chat ciklus, Trip Cart, I18n, Splash)
        ├── index.css           # Globális stílusok és egyedi kulcsképkocka-animációk
        │
        └── components/
            ├── ChatMessage.jsx     # Chat buborékok, markdown link parser, intelligens mentés/megosztás
            ├── SourceCard.jsx      # Interaktív helyszínkártyák kétirányú Trip Cart toggle gombbal
            ├── PlaceModal.jsx      # Felugró adatlap beágyazott interaktív Google Térképpel és kedvezménnyel
            ├── SavedPlansModal.jsx # Mentett tervek kezelője és Web Share API integráció
            └── LoadingDots.jsx     # Pattogó pontok gondolkodási animáció
```

---

## 🚀 6. Telepítés és Helyi Futtatás (Getting Started)

### 1. Előfeltételek
- **Node.js** (v18 vagy újabb) és **npm**
- **Python** (3.11 vagy újabb) és `pip`
- Egy ingyenes **Supabase** projekt engedélyezett `pgvector` kiterjesztéssel
- **Google Gemini API** kulcs ([Google AI Studio](https://aistudio.google.com/))
- **Google Maps Platform API** kulcs engedélyezett *Distance Matrix API* és *Maps Embed API* szolgáltatásokkal

---

### 2. Környezeti Változók Konfigurációja

Hozz létre egy `.env` fájlt a projekt gyökérkönyvtárában:
```env
# Supabase Konfiguráció
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-or-anon-key

# Google AI Studio API Kulcs
GEMINI_API_KEY=your-gemini-api-key

# Google Maps API Kulcs (Backend Distance Matrix Tool)
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

Hozz létre egy `frontend/.env` fájlt:
```env
# Backend API Alap URL
VITE_API_URL=http://localhost:8000

# Google Maps API Kulcs a Frontend Beágyazott Térképhez
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

### 3. Adatbázis Inicializálás és Seedelés

1. A Supabase felületén (SQL Editor) futtasd le a pgvector sémát és az indexet:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;

   CREATE TABLE IF NOT EXISTS public.locations (
       id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
       name text NOT NULL,
       description text NOT NULL,
       category text NOT NULL,
       discount_info text DEFAULT NULL,
       embedding vector(768) NOT NULL,
       created_at timestamp with time zone DEFAULT now() NOT NULL
   );

   CREATE INDEX IF NOT EXISTS locations_embedding_hnsw_idx 
   ON public.locations USING hnsw (embedding vector_cosine_ops);
   ```

2. Hozd létre a koszinusz-hasonlósági vektorkereső tárolt eljárást (`match_locations`):
   ```sql
   CREATE OR REPLACE FUNCTION public.match_locations(
       query_embedding vector(768),
       match_threshold double precision,
       match_count integer
   )
   RETURNS TABLE(
       id bigint,
       name text,
       description text,
       category text,
       discount_info text,
       similarity double precision
   )
   LANGUAGE sql STABLE
   AS $$
       SELECT
           id,
           name,
           description,
           category,
           discount_info,
           1 - (locations.embedding <=> query_embedding) AS similarity
       FROM locations
       WHERE 1 - (locations.embedding <=> query_embedding) > match_threshold
       ORDER BY similarity DESC
       LIMIT match_count;
   $$;
   ```

3. Töltsd fel a 23 siófoki helyszínt és a partnerkedvezményeket az adatbázisba:
   ```bash
   # Virtuális környezet létrehozása és aktiválása
   python3 -m venv venv
   source venv/bin/activate

   # Függőségek telepítése
   pip install -r backend/requirements.txt

   # Seed futtatása
   python backend/seed.py
   ```

---

### 4. Backend Indítása

Indítsd el a FastAPI szervert fejlesztői módban (hot-reload):
```bash
source venv/bin/activate
fastapi dev backend/main.py
# Vagy uvicorn használatával közvetlenül:
# uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
- API Életjel Ellenőrzés: [http://localhost:8000/health](http://localhost:8000/health)
- Interaktív Swagger Dokumentáció: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 5. Frontend Indítása és PWA Tesztelés

Egy külön terminálablakban:
```bash
cd frontend
npm install
npm run dev
```
Nyisd meg a böngészőt a [http://localhost:5173](http://localhost:5173) címen.

A végleges PWA Service Worker és telepíthetőség tesztelése:
```bash
cd frontend
npm run build
npm run preview
```
- **Google Chrome / Edge (Desktop):** Kattints a címsor jobb szélén megjelenő **"SioGuide telepítése"** ikonra.
- **iOS Safari:** Érintsd meg a **Megosztás $\rightarrow$ Főképernyőhöz adás** gombot.
- **Android Chrome:** Fogadd el a képernyő alján felugró **"Hozzáadás a kezdőképernyőhöz"** értesítést.

---

## 🗺️ 7. Továbbfejlesztési Ütemterv (Roadmap v2.0)

- [ ] **Valós idejű BAHART hajómenetrend:** A siófoki személyhajó- és kompmenetrendek élő lekérdezése a Balaton teljes vonalán.
- [ ] **PMS Rendszer Integráció:** Kétirányú szinkronizáció szállodai menedzsment rendszerekkel a digitális szobakulcs és szobaszám alapú automatikus kedvezmény-érvényesítéshez.
- [ ] **Balatoni Viharjelzés Push Értesítések:** Az Országos Meteorológiai Szolgálat (OMSZ) hivatalos balatoni viharjelzéseinek automatikus továbbítása PWA push értesítésként a parton tartózkodó vendégeknek.

---

## 📄 8. Licenc és Szerzőség (Academic Attribution)

Készült a siófoki **Müller's Vendégházak** megbízásából, egyetemi szoftverfejlesztési és mesterséges intelligencia záróprojektként.  
Minden jog fenntartva © 2026.

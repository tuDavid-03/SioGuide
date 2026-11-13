# SioGuide - AI Projekt Fejlesztési Dokumentum

## 1. Projekt Célja
RAG (Retrieval-Augmented Generation) alapú turisztikai és szállás-asszisztens a siófoki Müller's vendégházak számára.

## 2. Technológiai Stack
- Adatbázis: Supabase (PostgreSQL + pgvector)
- Backend: FastAPI (Python)
- Frontend: React (Vite + Tailwind CSS)

## 3. Szigorú Szabályok (CRITICAL RULES) az AI számára
1. **Olvasd és Frissítsd:** Minden feladat megkezdése előtt olvasd el ezt a fájlt. Amikor sikeresen befejeztél egy lépést a Roadmapen, módosítsd ezt a fájlt, és tedd az adott sorba az [x] jelzést!
2. **Moduláris haladás:** Szigorúan egy feladatot csinálj meg egyszerre a Roadmapről. NE írd meg előre a többi modult!
3. **Várakozás:** Ha végrehajtottad a feladatot és kipipáltad magadnak a `PROJECT_BOARD.md`-ben, ÁLLJ MEG! Várj a felhasználó 'Commitolva, mehetünk tovább' utasítására.

## 4. Aktuális Állapot és TODO (Roadmap)
- [x] Projektstruktúra és .env fájlok inicializálása
- [x] Supabase projekt létrehozása és MCP hitelesítés
- [x] Fázis 1.1: Supabase pgvector séma, `locations` tábla és `match_locations` RPC létrehozása az MCP-n keresztül
- [x] Fázis 1.2: FastAPI alapok, /health végpont, requirements.txt létrehozása a `backend` mappában
- [x] Fázis 1.3: FastAPI /ask végpont (RAG logika, vektorizálás, LLM hívás)
- [x] Fázis 1.4: Időjárás API (pl. Open-Meteo) integrálása a RAG promptba
- [x] Fázis 2.1: Python adatgeneráló szkript (seed.py) a dummy adatokhoz
- [x] Fázis 2.2: React frontend alapok és Chat UI létrehozása a `frontend` mappában
- [x] Fázis 2.3: Forrásmegjelölés kártyák hozzáadása a frontendhez
- [x] Fázis 3.1: Kód review, optimalizálás és bugfixek
- [x] Fázis 3.2: Projekt dokumentáció legenerálása a leadáshoz
- [x] Fázis 5.1: Adatbázis séma bővítése (discount_info oszlop és RPC frissítés), seed.py frissítése Müller's kedvezményekkel
- [x] Fázis 5.2: Backend: Gemini Function Calling (Google Maps API integráció) & discount_info a RAG kontextusban
- [x] Fázis 5.3: Frontend: Interaktív PlaceModal (Google Térkép beágyazás) és feltűnő Müller's Kedvezmény badge-ek a SourceCard-on
- [x] Fázis 5.4: Béta verzió záró tesztelés, kód review és dokumentáció frissítése

## 5. Fázis 6: Hangalapú Interakció, Többnyelvűség és UI Finomhangolás
- [x] Fázis 6.1: Frontend: Web Speech API integráció (elegáns mikrofon gomb, hangalapú diktálás, pulzáló hallgatózási UI)
- [x] Fázis 6.2: Backend: Többnyelvűség szigorú prompt-szabályozása (dinamikus HU / EN / DE válaszadás és kedvezmény-fordítás)
- [x] Fázis 6.3: Adatbázis bővítés (további siófoki partnerek, nyitvatartások és közvetlen elérhetőségek)
- [x] Fázis 6.4: Auto-nyelvfelismerés (I18n: HU/EN/DE), dinamikus üdvözlés & UI szótár, elegáns gombmentes automatikus Splash Screen
- [x] Fázis 6.5: PWA (Progressive Web App) integráció (vite-plugin-pwa, manifest, mobilos telepíthetőség)
- [x] Fázis 6.6: UI finomhangolás és Mobil Reszponzivitás (egyedi PWA logó integráció az emojik helyére, mobil fejléc és input sáv optimalizálása)
- [x] Fázis 6.6.1: UI takarítás és Mentett Programtervek (LocalStorage terv mentés, SavedPlansModal & Web Share API megosztás, Kedvezmények gyorsgomb)
- [x] Fázis 6.8: UX Fixek, Maps Útvonal Link és 'Tervhez adás' funkció (alsó térköz, mentés gomb szinkronizáció CustomEvent-tel, [+] Tervhez gyorsgomb a kártyákon, Google Maps többállomásos útvonal link a backendben)
- [x] Fázis 6.9: Intelligens Mentés Gomb és Útiterv-Kosár (Trip Cart) (intelligens szűrés ChatMessage-ben, helyszín kosárba gyűjtés SourceCard-on, lebegő Checkout sáv és automatikus prompt generálás)
- [x] Fázis 6.9.1: UI Finomítások és Béta 2 Véglegesítés (természetes kosár prompt, azonnali megosztás gomb a chatben, 📍 vízjel fejléc formázás)
- [x] Fázis 6.9.2: Kosár Elemek Eltávolítása (Toggle Funkció) (toggleTripCartItem az App.jsx-ben, aktív gomb visszavonás és ❌ Eltávolítás hover UX a SourceCard-on)


## 6. Jövőbeli Fejlesztések (v2.0)
- [ ] Fázis 6.7: Valós idejű BAHART hajómenetrend integráció (siófoki kikötői járatok lekérdezése)
- [ ] PMS szállásfoglalási motor közvetlen kétirányú szinkronizáció
- [ ] Valós idejű balatoni viharjelzés és Push értesítések PWA-ban


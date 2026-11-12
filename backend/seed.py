"""
seed.py – SioGuide adatbázis feltöltő szkript
==============================================
Futtatás (a backend/ mappából):
    pip install -r requirements.txt
    python seed.py

A szkript:
  1. Végigmegy a LOCATIONS listán.
  2. Minden helyszín leírását vektorizálja (Gemini gemini-embedding-001, 768 dim).
  3. Feltölti a nevet, leírást, kategóriát és vektort a Supabase `locations` táblába.
  4. Idempotens: újrafuttatás előtt törli a meglévő sorokat.
"""

import os
import sys
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types
from supabase import create_client

# ---------------------------------------------------------------------------
# Konfiguráció – .env betöltése (egy szinttel feljebb a gyökérben)
# ---------------------------------------------------------------------------
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

GEMINI_API_KEY    = os.environ["GEMINI_API_KEY"]
SUPABASE_URL      = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

EMBEDDING_MODEL   = "gemini-embedding-001"
EMBEDDING_DIM     = 768
TABLE_NAME        = "locations"

# ---------------------------------------------------------------------------
# Siófoki helyszínek (3 Müller's vendégház + éttermek + strandok + esős prog.)
# ---------------------------------------------------------------------------
LOCATIONS: list[dict] = [
    # --- Müller's vendégházak ---
    {
        "name": "Müller's Vendégház – Fő utca 104-106",
        "category": "szállás",
        "description": (
            "A Müller's vendégház egyik fő egysége Siófok belvárosában, a Fő utca 104-106 szám alatt. "
            "Kényelmes, légkondicionált szobák, ingyenes Wi-Fi, saját parkoló. "
            "Pár percre a Balatontól és a siófoki strandfürdőtől. "
            "Ideális hely nyaraláshoz, osztálykiránduláshoz és hosszabb tartózkodáshoz egyaránt."
        ),
    },
    {
        "name": "Müller's Vendégház – Kálmán Imre sétány 9",
        "category": "szállás",
        "description": (
            "A Müller's vendégház Kálmán Imre sétány 9 szám alatti épülete közvetlenül a Balatoni sétány közelében található. "
            "Tágas szobák, terasz, panoráma a Balatonra. Kerékpárkölcsönzés a helyszínen. "
            "Tökéletes választás víziport kedvelőknek és a siófoki partszakasz felfedezéséhez."
        ),
    },
    {
        "name": "Müller's Vendégház – Fő utca 114",
        "category": "szállás",
        "description": (
            "A Müller's vendégház Fő utca 114 szám alatti egysége csendes, parkosított környezetben, "
            "mégis a városközponthoz közel helyezkedik el. Önálló apartmanok, közös terasz és grillező. "
            "Hosszabb tartózkodáshoz és csoportos foglaláshoz különösen ajánlott."
        ),
    },

    # --- Strandok ---
    {
        "name": "Siófoki Strandfürdő (Nagystrand)",
        "category": "strand",
        "description": (
            "Siófok legnagyobb és legnépszerűbb homokos strandja, a Nagystrand. "
            "Stégek, vízicsúszdák, büfék, sportpályák és bérelhető napágyak várják a látogatókat. "
            "Napsütéses nyári napokon ideális fürdőzéshez, napozáshoz és vízisportokhoz. "
            "Belépő: felnőtteknek ~1200 Ft, gyerekeknek ~800 Ft."
        ),
    },
    {
        "name": "Aranypart Strand",
        "category": "strand",
        "description": (
            "Az Aranypart Strand Siófok keleti részén, csendesebb környezetben terül el. "
            "Kavicsos-homokos partszakasz, sekélyebb vízzel, kisgyermekes családok számára is ideális. "
            "Büfé, öltöző, zuhanyozó és parkoló elérhető. Napsütésben kiváló strandoláshoz."
        ),
    },

    # --- Éttermek ---
    {
        "name": "Csárda Siófok – Balatoni Halászcsárda",
        "category": "étterem",
        "description": (
            "Hagyományos balatoni halászcsárda a vízparton. Specialitás a fogassfilé, harcsapaprikás és "
            "balatoni rácponty. Hangulatos, fából készült terasz Balatonra néző panorámával. "
            "Este is nyitva, élőzene hétvégén. Foglalás ajánlott nyári szezonban."
        ),
    },
    {
        "name": "Palace étterem és kávéház",
        "category": "étterem",
        "description": (
            "Elegáns, belvároshoz közeli étterem és kávéház Siófokon. Magyar és nemzetközi fogások, "
            "széles vegán és vegetáriánus kínálattal. Belső teraszos rész esős időre is alkalmas. "
            "Különösen ajánlott vacsorára és ünnepi alkalmakra. Egész nap nyitva."
        ),
    },
    {
        "name": "Renegát Pub & Burger",
        "category": "étterem",
        "description": (
            "Hangulatos, fiatalos pub és burger étterem Siófok belvárosában. Kézműves hamburgerek, "
            "helyi sörök és koktélok. Esős estékre és esti programra tökéletes. "
            "Élő DJ-zene pénteken és szombaton. Éjfélig nyitva."
        ),
    },

    # --- Beltéri / esős programok ---
    {
        "name": "Palace Wellness & Spa",
        "category": "wellness / beltéri program",
        "description": (
            "Fedett wellness részleg Siófok egyik szállodájában: beltéri medence, szauna, gőzfürdő, "
            "masszázsszolgáltatások. Esős vagy hideg időben kiváló alternatíva a strandolás helyett. "
            "Napijegy váltható előzetes regisztrációval. Egész évben nyitva."
        ),
    },
    {
        "name": "Siófoki Kulturális Központ – Kálmán Imre Emlékház",
        "category": "kultúra / beltéri program",
        "description": (
            "Kálmán Imre, a világhírű operettszerző szülővárosában nyílt meg az emlékház. "
            "Interaktív kiállítás, hangfelvételek, kéziratok és személyes tárgyak. "
            "Esős napokra tökéletes program, körülbelül 1-2 óra alatt végigjárható. "
            "Nyitva tartás: Kedd–Vasárnap 10:00–17:00."
        ),
    },
    {
        "name": "Escape60 Szabadulószoba Siófok",
        "category": "szórakozás / beltéri program",
        "description": (
            "Izgalmas, tematikus szabadulószoba Siófok belvárosában. 2-6 főre ajánlott, "
            "csapatépítőnek és osztálykirándulásra egyaránt kiváló. "
            "Esős időben vagy este a legjobb beltéri program. Előfoglalás szükséges."
        ),
    },
    {
        "name": "Siófoki Mozi – Cinema City",
        "category": "szórakozás / beltéri program",
        "description": (
            "Modern multiplex mozi Siófok bevásárlóközpontjában. Aktuális magyar és külföldi filmek, "
            "3D vetítések. Esős napokon és estéken remek szórakozást kínál. "
            "Jegyek online is foglalhatók. Minden nap nyitva, vetítések 10:00-tól."
        ),
    },

    # --- Szabadtéri / aktív programok ---
    {
        "name": "Balatoni Hajókirándulás – BAHART kompjárat",
        "category": "hajókirándulás / szabadtéri program",
        "description": (
            "BAHART menetrendszerű hajójárat Siófokról Balatonfüredre, Tihanyba és Keszthelyre. "
            "Napsütéses napokon a legszebb módja a tó felfedezésének. "
            "Menetjegy: felnőtt ~2200 Ft. Szezonban naponta több indulás, Siófoki kikötőből."
        ),
    },
    {
        "name": "Siófoki Kerékpárút – Balatoni Bringakör",
        "category": "sport / szabadtéri program",
        "description": (
            "Siófokról induló kerékpáros túraútvonal a Balaton körüli bringakör részeként. "
            "Jól jelzett, biztonságos kerékpárút a parton és a városon keresztül. "
            "Kerékpár kölcsönözhető a Müller's vendégháznál és több ponton a belvárosban. "
            "Napsütéses időben aktív kikapcsolódáshoz ideális."
        ),
    },
    {
        "name": "Siófoki Vízisport Centrum",
        "category": "sport / vízisport",
        "description": (
            "Vízisport-bérlés a siófoki strandon: SUP (állódeszkázás), kaják, pedalók, vízibiciklik. "
            "Felszerelés és oktatás kezdőknek is elérhető. Csak szép, szélcsendes időben ajánlott. "
            "Szezon: május – szeptember."
        ),
    },

    # --- Esti / éjszakai programok ---
    {
        "name": "Flört Club Siófok",
        "category": "szórakozóhely / esti program",
        "description": (
            "Siófok egyik legismertebb és leghangulatosabb szórakozóhelye, a Flört Club. "
            "Fedett és nyitott terasszal, élő DJ-vel és tematikus bulikkal. "
            "Nyitva péntektől vasárnapig 22:00-tól hajnalig. 18 éven felülieknek."
        ),
    },
    {
        "name": "Siófoki Sétány és Kikötő esti séta",
        "category": "szabadtéri / esti program",
        "description": (
            "A siófoki kikötő és a Balatoni sétány esti megvilágításban különösen hangulatos. "
            "Ingyenes esti séta a vízparton, fagylaltozók és büfék nyitva estig. "
            "Párás nyári estéken romantikus program, fagyizással és sétahajóval kombinálható."
        ),
    },
]


# ---------------------------------------------------------------------------
# Embedding és feltöltés
# ---------------------------------------------------------------------------

def get_embedding(client: genai.Client, text: str) -> list[float]:
    """Egyetlen szöveg vektorizálása (768 dim)."""
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT",   # Dokumentum indexeléshez
            output_dimensionality=EMBEDDING_DIM,
        ),
    )
    return response.embeddings[0].values


def main() -> None:
    print("=" * 60)
    print("SioGuide – Seed Script")
    print("=" * 60)

    # Kliensek inicializálása
    gemini   = genai.Client(api_key=GEMINI_API_KEY)
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Idempotens: meglévő sorok törlése újrafuttatás előtt
    print("\n[1/3] Meglévő adatok törlése a 'locations' táblából...")
    supabase.table(TABLE_NAME).delete().neq("id", 0).execute()
    print("      ✓ Tábla ürítve.")

    # Vektorizálás + feltöltés
    print(f"\n[2/3] {len(LOCATIONS)} helyszín vektorizálása és feltöltése...\n")
    rows_to_insert = []

    for i, loc in enumerate(LOCATIONS, start=1):
        text_to_embed = f"{loc['name']}. {loc['description']}"
        print(f"  [{i:02d}/{len(LOCATIONS)}] Vektorizálás: {loc['name'][:50]}...")

        try:
            embedding = get_embedding(gemini, text_to_embed)
            rows_to_insert.append({
                "name":        loc["name"],
                "description": loc["description"],
                "category":    loc["category"],
                "embedding":   embedding,
            })
            # API rate limit elkerülése (ingyenes kvóta: 1500 req/perc)
            time.sleep(0.5)
        except Exception as e:
            print(f"      ✗ Hiba a vektorizálásnál: {e}")
            sys.exit(1)

    # Batch feltöltés
    print(f"\n[3/3] {len(rows_to_insert)} sor feltöltése a Supabase-be...")
    result = supabase.table(TABLE_NAME).insert(rows_to_insert).execute()
    inserted_count = len(result.data) if result.data else 0

    print(f"\n{'=' * 60}")
    print(f"✅ Kész! {inserted_count} helyszín sikeresen feltöltve.")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()

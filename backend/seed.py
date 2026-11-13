"""
seed.py – SioGuide adatbázis feltöltő szkript (Fázis 6.3.1: Árakkal, Kontaktokkal és Kedvezményekkel)
====================================================================================================
Futtatás:
    python seed.py

A szkript:
  1. Végigmegy a LOCATIONS listán (23 valós siófoki helyszín).
  2. Minden helyszín leírását kiegészíti a konkrét árakkal (price_info) és elérhetőséggel (contact).
  3. A szöveget (név + leírás + árak + kontakt + kedvezmény) vektorizálja (Gemini gemini-embedding-001, 768 dim).
  4. Feltölti a nevet, gazdagított leírást, kategóriát, discount_info-t és a vektort a Supabase `locations` táblába.
  5. Idempotens: újrafuttatás előtt üríti a meglévő sorokat.
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

GEMINI_API_KEY       = os.environ["GEMINI_API_KEY"]
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

EMBEDDING_MODEL   = "gemini-embedding-001"
EMBEDDING_DIM     = 768
TABLE_NAME        = "locations"

# ---------------------------------------------------------------------------
# Siófoki helyszínek (23 helyszín árakkal, foglalási kontaktokkal és kedvezményekkel)
# ---------------------------------------------------------------------------
LOCATIONS: list[dict] = [
    # --- Müller's vendégházak ---
    {
        "name": "Müller's Vendégház – Fő utca 104-106",
        "category": "szállás",
        "discount_info": None,
        "price_info": "Szobák: 14.000 - 26.000 Ft / fő / éj, Diák/csoportos kedvezmény elérhető",
        "contact": "+36 84 310 123 (Recepció / Szobafoglalás)",
        "description": (
            "A Müller's vendégház központi egysége Siófok szívében, a Fő utca 104-106 szám alatt. "
            "Kényelmes, légkondicionált szobák, ingyenes Wi-Fi, zárt parkoló és közösségi terek. "
            "Pár perces kényelmes sétára a Balatontól és a siófoki Nagystrandtól. "
            "Ideális nyaraláshoz, osztálykirándulásokhoz és baráti társaságoknak."
        ),
    },
    {
        "name": "Müller's Vendégház – Kálmán Imre sétány 9",
        "category": "szállás",
        "discount_info": None,
        "price_info": "Apartmanok: 16.000 - 30.000 Ft / fő / éj",
        "contact": "+36 84 310 124 (Recepció)",
        "description": (
            "A Müller's vendégház prémium panorámás épülete közvetlenül a Balatoni sétány és a part közelében. "
            "Tágas szobák, erkélyek, balatoni kilátás és helyszíni kerékpárkölcsönző. "
            "Tökéletes választás vízisportokhoz és a tóparti esti élethez."
        ),
    },
    {
        "name": "Müller's Vendégház – Fő utca 114",
        "category": "szállás",
        "discount_info": None,
        "price_info": "Önálló apartmanok: 15.000 - 28.000 Ft / fő / éj",
        "contact": "+36 84 310 125 (Recepció)",
        "description": (
            "A Müller's vendégház csendes, zöldövezeti apartmanháza saját belső udvarral és kerti grillezővel. "
            "Felszerelt konyhák, családbarát környezet, mindössze 500 méterre a belvárostól. "
            "Hosszabb tartózkodáshoz és nagyobb családoknak kiváló."
        ),
    },

    # --- Strandok ---
    {
        "name": "Siófoki Strandfürdő (Nagystrand)",
        "category": "strand",
        "discount_info": None,
        "price_info": "Felnőtt belépő: ~1.500 Ft, Diák/Nyugdíjas: ~1.000 Ft, 17:00 után 50% engedmény",
        "contact": "+36 84 310 500 (Pénztár és Információ)",
        "description": (
            "Siófok legnagyobb és legnépszerűbb homokos strandja, a Nagystrand. "
            "Napozóstégek, óriáscsúszdák, büfék, röplabdapályák, óriáskerék és bérelhető napágyak várják a vendégeket. "
            "Napsütéses nyári napokon a legkedveltebb fürdőhely a Balaton déli partján."
        ),
    },
    {
        "name": "Aranypart Strand",
        "category": "strand",
        "discount_info": None,
        "price_info": "Ingyenesen látogatható szabadstrand",
        "contact": "Közterület, Siófok Aranypart",
        "description": (
            "Több kilométer hosszú, ingyenes zöld szabadstrand Siófok keleti részén. "
            "Lassan mélyülő, sekély víz, kavicsos-homokos bejárók, játszóterek, büfék és öltözők. "
            "Kisgyermekes családoknak és nyugodt pihenésre ideális."
        ),
    },

    # --- Éttermek & Gasztronómia ---
    {
        "name": "Pietro Ristorante & Pizzeria",
        "category": "étterem",
        "discount_info": "15% kedvezmény minden pizzára és tésztára a szobakulcs felmutatásával!",
        "price_info": "Pizzák: 2.890 - 4.290 Ft, Tészták: 3.200 - 4.600 Ft, Desszertek: 1.490 Ft-tól",
        "contact": "+36 84 311 888 (Asztalfoglalás ajánlott)",
        "description": (
            "Tradicionális fatüzelésű kemencében sült nápolyi pizzák, kézműves tészták és olasz tiramisu Siófok belvárosában. "
            "A Müller's vendégházak hivatalos gasztro partnere: exkluzív 15% árengedmény a szállóvendégeknek. "
            "Mediterrán terasz és légkondicionált belső tér."
        ),
    },
    {
        "name": "Roxy Étterem és Kávézó",
        "category": "étterem",
        "discount_info": "10% árengedmény a főételek árából a Müller's vendégeknek!",
        "price_info": "Főételek: 3.600 - 5.900 Ft, Levesek: 1.690 Ft-tól, Kézműves kávék: 790 Ft-tól",
        "contact": "+36 84 310 031 (Asztalfoglalás és Információ)",
        "description": (
            "Modern, fiatalos étterem és kávézó Siófok Fő terén, közvetlenül a Víztorony lábánál. "
            "Friss alapanyagokból készülő magyaros klasszikusok, szaftos burgerek, saláták és házi limonádék. "
            "Tágas városi terasszal rendelkezik."
        ),
    },
    {
        "name": "Csárda Siófok – Balatoni Halászcsárda",
        "category": "étterem",
        "discount_info": None,
        "price_info": "Halászlé ponttyal/harcsával: 3.490 Ft, Süllőfilé kárpátiasan: 5.600 - 7.500 Ft",
        "contact": "+36 84 310 777 (Asztalfoglalás)",
        "description": (
            "Autentikus balatoni halászcsárda közvetlenül a vízpart közelében. "
            "Híres a bográcsos halászlé, ropogós sült fogas, harcsapaprikás túrós csuszával és a somlói galuska. "
            "Hangulatos faborítású terasz és hétvégi élő cigányzene."
        ),
    },
    {
        "name": "Palace étterem és kávéház",
        "category": "étterem",
        "discount_info": "10% kedvezmény a teljes számla végösszegéből a Müller's vendégeknek!",
        "price_info": "Napi menü: 2.490 Ft, Prémium főételek: 3.900 - 6.800 Ft",
        "contact": "+36 84 510 600 (Asztalfoglalás)",
        "description": (
            "Elegáns gasztronómiai élmény és specialty kávézó Siófok frekventált részén. "
            "Magyar és mediterrán fúziós ételek, bőséges vegán választék és szezonális borlap. "
            "Kiváló üzleti ebédekhez, romantikus vacsorákhoz és családi alkalmakra."
        ),
    },
    {
        "name": "Renegát Pub & Burger",
        "category": "étterem",
        "discount_info": "Ajándék kézműves szörp vagy pohár sör minden burger menü mellé!",
        "price_info": "Kézműves burgerek menüben sült krumplival: 2.990 - 4.590 Ft, Csapolt sörök: 990 Ft-tól",
        "contact": "+36 84 312 345",
        "description": (
            "Laza, amerikai stílusú burger bár és pub a siófoki éjszakai élet központjában. "
            "100% marhahúsból készült kézműves hamburgerek, pulled pork szendvicsek és helyi sörkülönlegességek. "
            "Élő sportközvetítések nagy kivetítőn és jó zene éjfélig."
        ),
    },
    {
        "name": "Marci Reggeliző és Brunch Bár",
        "category": "reggeliző / kávézó",
        "discount_info": "Ingyenes friss eszpresszó vagy házi limonádé minden reggeli tál mellé!",
        "price_info": "Brunch tálak és omlettek: 2.190 - 3.890 Ft, Amerikai palacsinta: 2.490 Ft",
        "contact": "+36 30 112 2334 (Asztalfoglalás reggelire)",
        "description": (
            "Hangulatos specialty kávézó és brunch bár Siófok központjában, a Fő tér szomszédságában. "
            "Friss kézműves croissant-ok, Eggs Benedict, avokádós pirítósok, smoothie-k és világos pörkölésű kávék már reggel 7:30-tól. "
            "A tökéletes napindító helyszín szállóvendégeknek."
        ),
    },

    # --- Beltéri / Wellness / Esős programok ---
    {
        "name": "Palace Wellness & Spa",
        "category": "wellness / beltéri program",
        "discount_info": "20% kedvezmény az egész napos wellness belépőből és ingyenes szauna használat!",
        "price_info": "Egész napos felnőtt belépő: 5.500 Ft (Müller's vendégkedvezménnyel csak 4.400 Ft)",
        "contact": "+36 84 510 601 (Wellness recepció)",
        "description": (
            "Modern, fedett élményfürdő és spa Siófokon: 32 fokos beltéri élménymedence, pezsgőfürdő, finn szaunavilág, infrakabin és gőzkamra. "
            "Esős, hűvös vagy borús napokon a legjobb választás a strandolás helyett. "
            "Masszázsok és kezelések előzetes időpontfoglalással vehetők igénybe."
        ),
    },
    {
        "name": "Escape60 Szabadulószoba Siófok",
        "category": "szórakozás / beltéri program",
        "discount_info": "15% csoportos kedvezmény osztálykirándulóknak és Müller's vendégeknek!",
        "price_info": "Játék ára (2-6 fős csapat): 14.000 - 22.000 Ft / szoba (kedvezménnyel 11.900 Ft-tól)",
        "contact": "+36 30 998 8776 (Időpontfoglalás kötelező)",
        "description": (
            "Lebilincselő, professzionálisan berendezett tematikus szabadulószobák Siófok belvárosában. "
            "Logikai feladványok, rejtélyek és csapatmunka 60 percen át. "
            "Kiemelten ajánlott osztálykirándulóknak, baráti társaságoknak és esős időre."
        ),
    },
    {
        "name": "Penthouse Pub & Bar – Sió Pláza",
        "category": "szórakozás / biliárd",
        "discount_info": "10% kedvezmény minden koktélra és biliárd óradíjra szobakulccsal!",
        "price_info": "Biliárdasztal bérlés: 2.800 Ft / óra, Koktélok: 2.490 - 3.890 Ft",
        "contact": "+36 84 506 888 (Asztalfoglalás)",
        "description": (
            "Prémium biliárd szalon és modern koktél lounge a Sió Pláza legfelső szintjén. "
            "Profi versenyasztalok, dartsgépek, kiváló koktélok és kényelmes bőrfotelek. "
            "Kiváló esti program barátoknak és osztálykirándulóknak esős napokon is."
        ),
    },
    {
        "name": "Siófoki Kulturális Központ – Kálmán Imre Emlékház",
        "category": "kultúra / beltéri program",
        "discount_info": None,
        "price_info": "Felnőtt belépő: 1.200 Ft, Diák/Pedagógus: 600 Ft",
        "contact": "+36 84 311 287 (Múzeumi információ)",
        "description": (
            "Kálmán Imre, a világhírű Csárdáskirálynő zeneszerzőjének szülőházában működő interaktív múzeum. "
            "Eredeti kották, személyes hangszerek, korabeli fotók és zenei bejátszások. "
            "Tartalmas kulturális élmény kb. 1-1.5 órás időtartamban. Nyitva: K-V 10:00-17:00."
        ),
    },
    {
        "name": "Siófoki Mozi – Cinema City",
        "category": "szórakozás / beltéri program",
        "discount_info": None,
        "price_info": "2D jegy: 2.200 Ft, 3D jegy: 2.700 Ft, Diákjegy kedvezménnyel elérhető",
        "contact": "+36 84 506 700 (Jegyinformáció)",
        "description": (
            "Korszerű, többtermes multiplex mozi a Sió Pláza épületében. "
            "Aktuális hollywoodi és magyar premierfilmek digitális vetítéssel és Dolby hangrendszerrel. "
            "Tökéletes esős délutáni vagy esti kikapcsolódás a pláza szívében."
        ),
    },

    # --- Látványosságok & Szabadtéri programok ---
    {
        "name": "Siófoki Víztorony és Kilátó",
        "category": "látványosság / kávézó",
        "discount_info": "15% kedvezmény a kilátó belépőjegy árából a szobakártya felmutatásával!",
        "price_info": "Kilátó felnőtt belépő: 1.500 Ft (kedvezménnyel 1.275 Ft), Diák: 1.000 Ft",
        "contact": "+36 84 506 500 (Turisztikai iroda)",
        "description": (
            "Siófok 45 méter magas központi szimbóluma a Fő téren. "
            "Panorámalift visz fel a csúcsra, ahol 360 fokos forgó kávézó és lélegzetelállító kilátás fogadja a vendégeket a Balatonra és a Tihanyi-félszigetre. "
            "Kihagyhatatlan fotópont Siófok központjában."
        ),
    },
    {
        "name": "Rózsakert és Hajóállomás Park",
        "category": "látványosság / park",
        "discount_info": None,
        "price_info": "Díjmentesen látogatható park",
        "contact": "Közterület, Siófok Kikötő",
        "description": (
            "Több száz rózsatővel beültetett, gondozott virágos díszpark közvetlenül a siófoki kikötő és a móló mellett. "
            "Kellemes árnyas fák, szökőkút, Karinthy Frigyes szobra és lenyűgöző kilátás a tóra és az elhaladó vitorlásokra. "
            "Ideális romantikus délutáni sétákhoz és fagyizáshoz."
        ),
    },
    {
        "name": "Balatoni Hajókirándulás – BAHART kompjárat",
        "category": "hajókirándulás / szabadtéri program",
        "discount_info": None,
        "price_info": "Menetjegy Siófok - Balatonfüred: Felnőtt ~2.600 Ft, Gyermek ~1.300 Ft, Kerékpár ~1.500 Ft",
        "contact": "+36 84 310 050 (Kikötői pénztár és Menetrend)",
        "description": (
            "Menetrend szerinti és nosztalgia sétahajózás a siófoki központi kikötőből. "
            "Közvetlen járatok indulnak Balatonfüredre, Tihanyba és Keszthelyre, valamint naplementés sétahajók pezsgővel. "
            "Szép időben a legkellemesebb módja a Balaton túlpartjának felfedezésére."
        ),
    },
    {
        "name": "Siófoki Kerékpárút – Balatoni Bringakör",
        "category": "sport / szabadtéri program",
        "discount_info": "Ingyenes kerékpártárolás és szervizpont a Müller's vendégházakban!",
        "price_info": "Kerékpárbérlés a Müller's vendégeknek: 3.000 Ft / nap (normál ár 4.500 Ft)",
        "contact": "+36 84 310 123 (Kerékpárkölcsönzés a vendégházban)",
        "description": (
            "Közvetlenül a vendégházak közeléből induló, jól kitáblázott kerékpárút a Balatoni Bringakörút részeként. "
            "Biztonságos tóparti szakaszok, büfék és pihenőhelyek Szántód és Zamárdi felé. "
            "Bicikli kölcsönözhető a Müller's vendégházban."
        ),
    },
    {
        "name": "Siófoki Vízisport Centrum",
        "category": "sport / vízisport",
        "discount_info": "1 órás SUP vagy vízibicikli bérlés mellé +30 perc ajándék használat!",
        "price_info": "SUP bérlés: 2.500 Ft / óra (+30 perc bónusz!), Vízibicikli: 4.000 Ft / óra",
        "contact": "+36 30 456 7890 (Strandi bázis)",
        "description": (
            "Közvetlenül a Nagystrandon működő vízisport kölcsönző és oktatóközpont. "
            "Stand-up paddle (SUP) deszkák, tengeri kajakok, családi vízibiciklik és mentőmellények. "
            "Müller's szállóvendégeknek garantált +30 perc extra bónusz idő jár minden bérléshez."
        ),
    },

    # --- Esti szórakozás & Séták ---
    {
        "name": "Flört Club Siófok",
        "category": "szórakozóhely / esti program",
        "discount_info": "Éjfélig díjtalan belépés Müller's vendégkártyával!",
        "price_info": "Belépőjegy: 3.000 - 5.000 Ft (Müller's kártyával éjfélig 0 Ft!)",
        "contact": "+36 84 310 666 (VIP asztalfoglalás)",
        "description": (
            "Siófok legendás szórakozóhelye fedett és nyitott panorámás terasszal, élvonalbeli hazai és nemzetközi DJ-kkel. "
            "Rendezvények péntektől vasárnapig 22:00-tól hajnalig. "
            "A Müller's vendégek a szobakártyájukkal soron kívül és éjfélig teljesen ingyenesen léphetnek be."
        ),
    },
    {
        "name": "Siófoki Sétány és Kikötő esti séta",
        "category": "szabadtéri / esti program",
        "discount_info": None,
        "price_info": "Ingyenes esti program",
        "contact": "Közterület, Siófok Petőfi sétány és móló",
        "description": (
            "A Balatoni sétány és a kikötői móló esti díszkivilágításban, tóparti büfékkel, kézműves fagylaltozókkal és élő utcazenével. "
            "Kellemes nyári estéken kihagyhatatlan romantikus vagy baráti séta a vízparton, csodás rálátással a tó túlsó partjának fényeire."
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
    print("SioGuide – Seed Script (Fázis 6.3.1: Árak, Kontaktok & Kedvezmények)")
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
        # Összeállítjuk a gazdagított leírást árakkal és kontaktokkal
        desc_parts = [loc["description"]]
        if loc.get("price_info"):
            desc_parts.append(f"Árak / Költségek: {loc['price_info']}.")
        if loc.get("contact"):
            desc_parts.append(f"Kapcsolat / Foglalás: {loc['contact']}.")

        full_description = " ".join(desc_parts)

        # Szöveg az embeddinghez (név + gazdagított leírás + kedvezmény)
        text_to_embed = f"{loc['name']}. {full_description}"
        if loc.get("discount_info"):
            text_to_embed += f" Különleges kedvezmény Müller's vendégeknek: {loc['discount_info']}"

        print(f"  [{i:02d}/{len(LOCATIONS)}] Vektorizálás: {loc['name'][:40]}... {'🎁' if loc.get('discount_info') else ''}")

        try:
            embedding = get_embedding(gemini, text_to_embed)
            rows_to_insert.append({
                "name":          loc["name"],
                "description":   full_description,
                "category":      loc["category"],
                "discount_info": loc.get("discount_info"),
                "embedding":     embedding,
            })
            time.sleep(0.35)
        except Exception as e:
            print(f"      ✗ Hiba a vektorizálásnál: {e}")
            sys.exit(1)

    # Batch feltöltés
    print(f"\n[3/3] {len(rows_to_insert)} sor feltöltése a Supabase-be...")
    result = supabase.table(TABLE_NAME).insert(rows_to_insert).execute()
    inserted_count = len(result.data) if result.data else 0

    print(f"\n{'=' * 60}")
    print(f"✅ Kész! {inserted_count} helyszín sikeresen feltöltve árakkal és kontaktokkal.")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    main()

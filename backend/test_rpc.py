"""
test_rpc.py – Supabase match_locations RPC és pgvector keresés tesztelése
Futtatás a backend/ mappából:
    python test_rpc.py
"""
import os
import math
import json
from dotenv import load_dotenv
from supabase import create_client
from google import genai
from google.genai import types

# 1. .env betöltése
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
GEMINI_KEY   = os.environ["GEMINI_API_KEY"]

sb = create_client(SUPABASE_URL, SUPABASE_KEY)
gemini = genai.Client(api_key=GEMINI_KEY)

print("=" * 60)
print("SioGuide – RPC és Vektorkeresés Diagnosztika")
print("=" * 60)

# 2. Vektor generálása a valódi keresőkérdésre
query = "Müller's vendégházak"
print(f"\n[1] Vektorizálás: '{query}'...")
emb_resp = gemini.models.embed_content(
    model="gemini-embedding-001",
    contents=query,
    config=types.EmbedContentConfig(
        task_type="RETRIEVAL_QUERY",
        output_dimensionality=768,
    ),
)
query_vec = emb_resp.embeddings[0].values
print(f"    Sikeres! Vektor dimenzió: {len(query_vec)}")

# 3. Közvetlen matematikai koszinusz számítás (Adatbázis ellenőrzése index nélkül)
print("\n[2] Közvetlen koszinusz-hasonlóság ellenőrzése az adatbázis soraival:")
rows = sb.table("locations").select("id, name, category, embedding").execute().data

def cos_sim(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    return dot / (norm_a * norm_b)

exact_scores = []
for r in rows:
    v = json.loads(r["embedding"]) if isinstance(r["embedding"], str) else r["embedding"]
    score = cos_sim(query_vec, v)
    exact_scores.append((score, r["name"], r["category"]))

exact_scores.sort(key=lambda x: x[0], reverse=True)
for score, name, cat in exact_scores[:5]:
    print(f"    → [{score:.4f}] {name} ({cat})")

# 4. Supabase match_locations RPC hívás tesztelése list[float] típussal
print("\n[3] Supabase match_locations RPC hívás (threshold=0.3):")
try:
    rpc_res = sb.rpc("match_locations", {
        "query_embedding": query_vec,
        "match_threshold": 0.3,
        "match_count": 5,
    }).execute()
    
    results = rpc_res.data or []
    print(f"    RPC találatok száma: {len(results)}")
    for r in results:
        print(f"    → [{r.get('similarity', 0):.4f}] {r.get('name')} ({r.get('category')})")
    if not results:
        print("    ⚠️  Az RPC 0 találatot adott (az IVFFlat index probléma miatt - lásd alább)!")
except Exception as e:
    print(f"    HIBA az RPC hívásnál: {e}")

# 5. Dummy vektor teszt (0.1 értékekkel, threshold=-1.0)
print("\n[4] Dummy vektor teszt ([0.1] * 768, threshold=-1.0):")
dummy_vec = [0.1] * 768
try:
    dummy_res = sb.rpc("match_locations", {
        "query_embedding": dummy_vec,
        "match_threshold": -1.0,
        "match_count": 3,
    }).execute()
    print(f"    Dummy találatok száma: {len(dummy_res.data or [])}")
except Exception as e:
    print(f"    HIBA a dummy tesztnél: {e}")

print("\n" + "=" * 60)

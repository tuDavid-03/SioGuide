import { useState, useEffect } from 'react'

/**
 * Egyszerű markdown formázás a mentett szövegek megjelenítéséhez
 * Támogatja a Markdown linkeket, félkövér és dőlt formázást, és sortöréseket.
 */
function parseSimpleMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-bold text-lake-600 hover:text-lake-800 underline hover:no-underline">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/\n/g,            '<br />')
}

function formatDate(isoString) {
  try {
    const d = new Date(isoString)
    return d.toLocaleString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function SavedPlansModal({ isOpen, onClose, onPlansChange }) {
  const [plans, setPlans]       = useState([])
  const [copiedId, setCopiedId] = useState(null)

  // Tervek betöltése localStorage-ból nyitáskor
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = JSON.parse(localStorage.getItem('sioguide_saved_plans') || '[]')
        setPlans(stored)
      } catch (err) {
        console.error('Hiba a mentett tervek betöltésekor:', err)
        setPlans([])
      }
    }
  }, [isOpen])

  // Escape billentyű figyelése
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Terv törlése
  function handleDelete(id) {
    const deletedPlan = plans.find(p => p.id === id)
    const updated = plans.filter(p => p.id !== id)
    setPlans(updated)
    try {
      localStorage.setItem('sioguide_saved_plans', JSON.stringify(updated))
      onPlansChange?.(updated.length)
      // CustomEvent küldése a ChatMessage komponensek állapotának azonnali szinkronizálására
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('planDeleted', {
          detail: { id, text: deletedPlan?.text }
        }))
      }
    } catch (err) {
      console.error('Hiba a törlés mentésekor:', err)
    }
  }

  // Terv megosztása (Web Share API vagy vágólap fallback)
  async function handleShare(plan) {
    const shareText = `🌊 SioGuide Programterv Siófok:\n\n${plan.text}\n\nKészült a SioGuide Müller's AI Asszisztenssel.`
    const shareData = {
      title: 'SioGuide Balatoni Programterv',
      text: shareText,
    }

    if (navigator?.share && navigator?.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    // Fallback: Vágólapra másolás
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareText)
        setCopiedId(plan.id)
        setTimeout(() => setCopiedId(null), 2500)
      } catch {
        alert('Nem sikerült vágólapra másolni.')
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-lake-100 overflow-hidden flex flex-col max-h-[88vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Fejléc ── */}
        <div className="px-5 py-4 border-b border-lake-100 flex items-center justify-between gap-3 bg-gradient-to-b from-lake-50/50 to-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl select-none">🗺️</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-lake-900 leading-tight">
                  Mentett Programtervek
                </h2>
                {plans.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-lake-100 text-lake-800">
                    {plans.length} db
                  </span>
                )}
              </div>
              <p className="text-[11px] text-lake-500">
                Saját útvonalaid és kedvenc ajánlataid
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Bezárás"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── Modal Törzs ── */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {plans.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-lake-50 border border-lake-100 flex items-center justify-center text-3xl mb-3 shadow-inner">
                📝
              </div>
              <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1">
                Még nincsenek mentett programterveid
              </h3>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                Kérj a SioGuide-tól egy siófoki útvonalat vagy programajánlót, majd kattints a válasz alatti <strong>💾 Terv mentése</strong> gombra!
              </p>
            </div>
          ) : (
            plans.map((plan, index) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-lake-200/80 bg-white shadow-xs hover:shadow-md transition-shadow p-4 space-y-3"
              >
                {/* Kártya fejléc */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-lake-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-lake-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-lake-900">
                      {formatDate(plan.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Megosztás Gomb */}
                    <button
                      type="button"
                      onClick={() => handleShare(plan)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl transition-all shadow-xs active:scale-95 ${
                        copiedId === plan.id
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-lake-50 hover:bg-lake-100 text-lake-700 border border-lake-200'
                      }`}
                      title="Megosztás barátokkal vagy vágólapra másolás"
                    >
                      <span>{copiedId === plan.id ? '✓' : '📤'}</span>
                      <span>{copiedId === plan.id ? 'Kimásolva!' : 'Megosztás'}</span>
                    </button>

                    {/* Törlés Gomb */}
                    <button
                      type="button"
                      onClick={() => handleDelete(plan.id)}
                      className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Terv törlése"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Kártya tartalma (formázott markdown) */}
                <div
                  className="text-xs sm:text-sm text-gray-800 leading-relaxed max-h-56 overflow-y-auto pr-1"
                  dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(plan.text) }}
                />
              </div>
            ))
          )}
        </div>

        {/* ── Modal Lábléc ── */}
        <div className="px-5 py-3 border-t border-lake-100 bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            A tervek csak a böngésződben vannak tárolva
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-xs transition-colors"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  )
}

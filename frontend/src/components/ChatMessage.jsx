import { useState, useEffect } from 'react'

/**
 * ChatMessage – egy chat buborék (user vagy assistant)
 * A markdown **félkövér** és *dőlt* jelöléseket egyszerűen rendereli.
 * Az asszisztens avatárja a hivatalos SioGuide PWA logót használja.
 * Az AI válasza alatt megjelenik egy diszkrét '💾 Terv mentése' gomb.
 */

function parseSimpleMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-bold text-lake-600 hover:text-lake-800 underline hover:no-underline">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/\n/g,            '<br />')
}

export default function ChatMessage({ role, text, onSavePlan }) {
  const isUser = role === 'user'

  const [saved, setSaved] = useState(() => {
    if (isUser || typeof window === 'undefined') return false
    try {
      const existing = JSON.parse(localStorage.getItem('sioguide_saved_plans') || '[]')
      return existing.some(p => p.text === text)
    } catch {
      return false
    }
  })

  // Szinkronizáció: ha a SavedPlansModal-ban törölnek egy tervet (planDeleted CustomEvent)
  useEffect(() => {
    if (isUser || typeof window === 'undefined') return

    function checkSync() {
      try {
        const existing = JSON.parse(localStorage.getItem('sioguide_saved_plans') || '[]')
        setSaved(existing.some(p => p.text === text))
      } catch {
        setSaved(false)
      }
    }

    checkSync()
    window.addEventListener('planDeleted', checkSync)
    return () => window.removeEventListener('planDeleted', checkSync)
  }, [text, isUser])

  function handleSave() {
    if (saved) return
    const success = onSavePlan ? onSavePlan(text) : true
    if (success !== false) {
      setSaved(true)
    }
  }

  return (
    <div className={`flex items-start gap-2.5 sm:gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs overflow-hidden
        ${isUser ? 'bg-lake-100 text-lake-700' : 'bg-lake-900 border border-lake-200/50'}`}>
        {isUser ? (
          <span className="text-sm select-none">👤</span>
        ) : (
          <img
            src="/pwa-192x192.png"
            alt="SioGuide"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Buborék & Akciógomb konténer */}
      <div className="flex flex-col gap-1 max-w-[85%] sm:max-w-[80%]">
        <div
          className={`px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs
            ${isUser
              ? 'bg-lake-600 text-white rounded-tr-sm'
              : 'bg-white text-gray-800 rounded-tl-sm border border-lake-100'
            }`}
          dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(text) }}
        />

        {/* AI üzenet alatti mentés gyorsgomb */}
        {!isUser && text && (
          <div className="flex items-center justify-start pt-0.5">
            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg transition-all shadow-2xs ${
                saved
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 cursor-default'
                  : 'bg-lake-50/70 hover:bg-lake-100 text-lake-700 border border-lake-200/60 active:scale-95'
              }`}
              title={saved ? 'Ez a terv el van mentve a mentett tervek közé' : 'Terv mentése a mentett tervek közé'}
            >
              <span>{saved ? '✓' : '💾'}</span>
              <span>{saved ? 'Terv elmentve' : 'Terv mentése'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

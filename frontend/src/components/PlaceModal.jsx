import { useEffect } from 'react'

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

const CATEGORY_ICONS = {
  'szállás':                            '🏠',
  'strand':                             '🏖️',
  'étterem':                            '🍽️',
  'wellness / beltéri program':         '💆',
  'kultúra / beltéri program':          '🎭',
  'szórakozás / beltéri program':       '🎮',
  'hajókirándulás / szabadtéri program':'⛵',
  'sport / szabadtéri program':         '🚴',
  'sport / vízisport':                  '🏄',
  'szórakozóhely / esti program':       '🎉',
  'szabadtéri / esti program':          '🌙',
}

export default function PlaceModal({ place, onClose }) {
  if (!place) return null

  const { name, category, description, similarity, discount_info } = place
  const icon = CATEGORY_ICONS[category] || '📍'
  const pct  = Math.round((similarity || 0) * 100)

  // Escape billentyű figyelése
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Google Maps Embed URL
  const queryParam = encodeURIComponent(`${name}, Siófok`)
  const embedUrl = MAPS_API_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_API_KEY}&q=${queryParam}&language=hu`
    : null

  const externalMapsUrl = `https://www.google.com/maps/search/?api=1&query=${queryParam}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-lake-100 overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Fejléc ── */}
        <div className="relative px-6 pt-6 pb-4 border-b border-lake-100 flex items-start justify-between gap-4 bg-gradient-to-b from-lake-50/50 to-white">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-lake-100 border border-lake-200 flex items-center justify-center text-2xl shrink-0 shadow-sm">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-lake-600 bg-lake-100/70 px-2.5 py-0.5 rounded-full">
                  {category}
                </span>
                {pct > 0 && (
                  <span className="text-[11px] font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    {pct}% egyezés
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-1 leading-snug">
                {name}
              </h2>
            </div>
          </div>

          {/* Bezárás gomb (X) */}
          <button
            onClick={onClose}
            aria-label="Bezárás"
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── Modal Törzs (Görgethető) ── */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Müller's Kedvezmény Kiemelés */}
          {discount_info && (
            <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-amber-300 shadow-sm relative overflow-hidden">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">🎁</span>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                    Exkluzív Müller's Vendégkedvezmény
                  </h3>
                  <p className="text-sm font-semibold text-rose-900 mt-1 leading-relaxed">
                    {discount_info}
                  </p>
                  <p className="text-[11px] text-amber-700/80 mt-1.5 italic">
                    Érvényesítés: Mutasd fel a Müller's vendégház szobakulcsát vagy vendégkártyáját!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leírás */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              A helyszínről
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
              {description}
            </p>
          </div>

          {/* ── Interaktív Google Térkép (Iframe) ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🗺️</span>
                <span>Interaktív Google Térkép</span>
              </h4>
              <a
                href={externalMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-lake-600 hover:text-lake-800 hover:underline flex items-center gap-1"
              >
                Megnyitás Google Térképen &rarr;
              </a>
            </div>

            <div className="w-full h-64 rounded-2xl overflow-hidden border border-lake-200 shadow-inner bg-lake-50">
              {embedUrl ? (
                <iframe
                  title={`Google Maps - ${name}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={embedUrl}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-gray-500">
                  <span className="text-3xl mb-2">📍</span>
                  <p className="text-sm font-medium">A Google Maps API kulcs nincs konfigurálva a frontend .env fájlban.</p>
                  <a
                    href={externalMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 px-4 py-2 rounded-xl bg-lake-600 text-white text-xs font-semibold hover:bg-lake-700 transition-colors shadow-sm"
                  >
                    Megtekintés külső térképen
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Modal Lábléc ── */}
        <div className="px-6 py-4 border-t border-lake-100 bg-gray-50/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/80 transition-colors"
          >
            Bezárás
          </button>
          <a
            href={externalMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-lake-600 hover:bg-lake-700 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
          >
            <span>🧭</span>
            <span>Útvonaltervezés</span>
          </a>
        </div>
      </div>
    </div>
  )
}

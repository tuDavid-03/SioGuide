/**
 * SourceCard – Interaktív, kattintható RAG forrás kártya
 * - Megjeleníti a helyszín nevét, kategóriáját, leírását és hasonlósági %-át
 * - Kiemelt '🎁 Kedvezmény' badge, ha elérhető Müller's partnerkedvezmény
 * - Rákattintva megnyitja a PlaceModal-t interaktív Google Térképpel
 */

// Kategória → emoji + háttérszín
const CATEGORY_STYLES = {
  'szállás':                            { icon: '🏠', bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700'   },
  'strand':                             { icon: '🏖️', bg: 'bg-cyan-50',   border: 'border-cyan-200',   badge: 'bg-cyan-100 text-cyan-700'   },
  'étterem':                            { icon: '🍽️', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700'},
  'wellness / beltéri program':         { icon: '💆', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700'},
  'kultúra / beltéri program':          { icon: '🎭', bg: 'bg-rose-50',   border: 'border-rose-200',   badge: 'bg-rose-100 text-rose-700'   },
  'szórakozás / beltéri program':       { icon: '🎮', bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700'},
  'hajókirándulás / szabadtéri program':{ icon: '⛵', bg: 'bg-sky-50',   border: 'border-sky-200',    badge: 'bg-sky-100 text-sky-700'     },
  'sport / szabadtéri program':         { icon: '🚴', bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700' },
  'sport / vízisport':                  { icon: '🏄', bg: 'bg-teal-50',   border: 'border-teal-200',   badge: 'bg-teal-100 text-teal-700'   },
  'szórakozóhely / esti program':       { icon: '🎉', bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700'   },
  'szabadtéri / esti program':          { icon: '🌙', bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700'},
  'szórakozás / biliárd':               { icon: '🎱', bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700'},
  'látványosság / park':                { icon: '🌹', bg: 'bg-emerald-50',border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700'},
  'látványosság / kávézó':              { icon: '🗼', bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700'  },
  'reggeliző / kávézó':                 { icon: '☕', bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700'  },
}

const DEFAULT_STYLE = { icon: '📍', bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600' }

function getStyle(category) {
  return CATEGORY_STYLES[category] ?? DEFAULT_STYLE
}

// Hasonlóság → szín + szöveg
function getSimilarityStyle(sim) {
  if (sim >= 0.75) return { bar: 'bg-green-500',  text: 'text-green-700',  label: 'Kiváló egyezés' }
  if (sim >= 0.55) return { bar: 'bg-yellow-400', text: 'text-yellow-700', label: 'Jó egyezés'     }
  if (sim >= 0.35) return { bar: 'bg-orange-400', text: 'text-orange-700', label: 'Részleges'      }
  return                  { bar: 'bg-gray-300',   text: 'text-gray-500',   label: 'Gyenge'         }
}

export default function SourceCard({ source, onClick, onAddToCart, isInCart }) {
  const { name, category, description, similarity, discount_info } = source
  const pct    = Math.round(similarity * 100)
  const style  = getStyle(category)
  const simSty = getSimilarityStyle(similarity)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={`
        group relative overflow-hidden rounded-2xl border ${style.border} ${style.bg}
        p-3.5 shadow-sm cursor-pointer select-none text-left
        transition-all duration-200
        hover:shadow-lg hover:-translate-y-1 hover:border-lake-400
        active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-lake-400
      `}
    >
      {/* Dekoratív fényeffekt hoverre */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      bg-gradient-to-br from-white/70 via-transparent to-lake-100/30 pointer-events-none" />

      {/* Kiemelt Müller's Kedvezmény Badge (ha van) */}
      {discount_info && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full
                           bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white shadow-sm
                           ring-1 ring-amber-300 animate-pulse">
            <span>🎁</span>
            <span>Müller's Kedvezmény</span>
          </span>
        </div>
      )}

      {/* Fejléc: ikon + név + kategória */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0 drop-shadow-sm" role="img" aria-label={category}>
            {style.icon}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-xs text-gray-900 truncate leading-tight group-hover:text-lake-700 transition-colors">
              {name}
            </p>
            <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${style.badge}`}>
              {category}
            </span>
          </div>
        </div>

        {/* Hasonlósági % */}
        <div className="shrink-0 text-right">
          <span className={`text-lg font-extrabold tabular-nums ${simSty.text}`}>
            {pct}%
          </span>
          <p className={`text-[9px] font-medium ${simSty.text} opacity-80`}>
            {simSty.label}
          </p>
        </div>
      </div>

      {/* Hasonlósági progress sáv */}
      <div className="w-full h-1 rounded-full bg-gray-200 mb-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${simSty.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Leírás előnézet */}
      <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">
        {description}
      </p>

      {/* Kattintás és akció alsó sáv */}
      <div className="mt-2.5 pt-2 border-t border-gray-200/50 flex items-center justify-between text-[11px] gap-2">
        <span className="text-[10px] text-gray-500 group-hover:text-lake-600 transition-colors">
          🗺️ Térkép &rarr;
        </span>
        <button
          type="button"
          disabled={isInCart}
          onClick={(e) => {
            e.stopPropagation()
            if (!isInCart) {
              onAddToCart?.(name)
            }
          }}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[10px] shadow-xs transition-all z-10 ${
            isInCart
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80 cursor-default opacity-90'
              : 'bg-lake-600 hover:bg-lake-700 active:scale-95 text-white cursor-pointer'
          }`}
          title={isInCart ? `"${name}" hozzáadva a kiválasztott helyszínekhez` : `"${name}" hozzáadása a programterv-kosárhoz`}
        >
          <span>{isInCart ? '✓' : '➕'}</span>
          <span>{isInCart ? 'Hozzáadva' : 'Tervhez'}</span>
        </button>
      </div>
    </div>
  )
}

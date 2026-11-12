/**
 * SourceCard – RAG forrás kártya profi hover effektekkel
 * Megjeleníti a helyszín nevét, kategóriáját, leírását és hasonlósági %-át.
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

export default function SourceCard({ source }) {
  const { name, category, description, similarity } = source
  const pct    = Math.round(similarity * 100)
  const style  = getStyle(category)
  const simSty = getSimilarityStyle(similarity)

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl border ${style.border} ${style.bg}
        p-3.5 shadow-sm cursor-default select-none
        transition-all duration-200
        hover:shadow-lg hover:-translate-y-0.5 hover:border-opacity-80
      `}
    >
      {/* Dekoratív háttér-gradient hover-re */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />

      {/* Fejléc: ikon + név + kategória badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0 drop-shadow-sm"
                role="img" aria-label={category}>
            {style.icon}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-xs text-gray-900 truncate leading-tight">
              {name}
            </p>
            <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5
                              rounded-full capitalize ${style.badge}`}>
              {category}
            </span>
          </div>
        </div>

        {/* Hasonlósági % – kiemelve */}
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
      <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2
                    group-hover:line-clamp-none transition-all duration-200">
        {description}
      </p>
    </div>
  )
}

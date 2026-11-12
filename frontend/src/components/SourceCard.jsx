/**
 * SourceCard – egy helyszín-forrás kártya a RAG válasz alatt
 */

const CATEGORY_ICONS = {
  'szállás':                   '🏠',
  'strand':                    '🏖️',
  'étterem':                   '🍽️',
  'wellness / beltéri program':'💆',
  'kultúra / beltéri program': '🎭',
  'szórakozás / beltéri program':'🎮',
  'hajókirándulás / szabadtéri program': '⛵',
  'sport / szabadtéri program':'🚴',
  'sport / vízisport':         '🏄',
  'szórakozóhely / esti program':'🎉',
  'szabadtéri / esti program': '🌙',
}

function getIcon(category) {
  return CATEGORY_ICONS[category] ?? '📍'
}

function similarityColor(sim) {
  if (sim >= 0.75) return 'bg-green-100 text-green-700'
  if (sim >= 0.55) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-500'
}

export default function SourceCard({ source }) {
  const { name, category, description, similarity } = source
  const pct = Math.round(similarity * 100)

  return (
    <div className="bg-white border border-lake-100 rounded-xl px-3 py-2.5 shadow-sm
                    hover:shadow-md hover:border-lake-300 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0">{getIcon(category)}</span>
          <p className="font-semibold text-xs text-lake-900 truncate">{name}</p>
        </div>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${similarityColor(similarity)}`}>
          {pct}%
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500 capitalize">{category}</p>
      <p className="mt-1 text-xs text-gray-600 line-clamp-2">{description}</p>
    </div>
  )
}

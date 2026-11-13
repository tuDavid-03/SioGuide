/**
 * ChatMessage – egy chat buborék (user vagy assistant)
 * A markdown **félkövér** és *dőlt* jelöléseket egyszerűen rendereli.
 * Az asszisztens avatárja a hivatalos SioGuide PWA logót használja.
 */

function parseSimpleMarkdown(text) {
  // **félkövér** → <strong>, *dőlt* → <em>, sortörések megőrzése
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/\n/g,            '<br />')
}

export default function ChatMessage({ role, text }) {
  const isUser = role === 'user'

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

      {/* Buborék */}
      <div
        className={`max-w-[85%] sm:max-w-[80%] px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs
          ${isUser
            ? 'bg-lake-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 rounded-tl-sm border border-lake-100'
          }`}
        dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(text) }}
      />
    </div>
  )
}

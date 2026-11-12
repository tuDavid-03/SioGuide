/**
 * ChatMessage – egy chat buborék (user vagy assistant)
 * A markdown **félkövér** és *dőlt* jelöléseket egyszerűen rendereli.
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
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm
        ${isUser ? 'bg-lake-100 text-lake-700' : 'bg-lake-600 text-white'}`}>
        <span className="text-sm">{isUser ? '👤' : '🤖'}</span>
      </div>

      {/* Buborék */}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
          ${isUser
            ? 'bg-lake-600 text-white rounded-tr-sm'
            : 'bg-white text-gray-800 rounded-tl-sm border border-lake-100'
          }`}
        dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(text) }}
      />
    </div>
  )
}

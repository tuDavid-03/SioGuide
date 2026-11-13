import { useState, useRef, useEffect } from 'react'
import ChatMessage from './components/ChatMessage'
import SourceCard from './components/SourceCard'
import LoadingDots from './components/LoadingDots'
import PlaceModal from './components/PlaceModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const WELCOME_MESSAGE = {
  role: 'assistant',
  text: 'Üdvözöllek! 🌊 Én vagyok a **SioGuide**, a Müller\'s vendégházak AI asszisztense. Kérdezz bármit Siófokról – strandok, éttermek, programok, időjárás, gyalogos távolságok vagy szállásinformációk!',
  sources: [],
}

export default function App() {
  const [messages, setMessages]           = useState([WELCOME_MESSAGE])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const bottomRef                         = useRef(null)
  const inputRef                          = useRef(null)

  // Automatikus görgetés az utolsó üzenetre
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text: question, sources: [] }])
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || `Szerverhiba: ${res.status}`)
      }

      const data = await res.json()
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: data.answer, sources: data.sources || [] },
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto px-4">

      {/* ── Header ── */}
      <header className="py-5 border-b border-lake-200 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lake-600 flex items-center justify-center shadow">
            <span className="text-white text-xl">🌊</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-lake-900 leading-tight">SioGuide</h1>
            <p className="text-xs text-lake-500">Müller's Vendégházak · Agentic AI Asszisztens</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-xs">
            <span>🎁</span>
            <span>Partnerkedvezmények</span>
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-lake-100 text-lake-800 border border-lake-200 flex items-center gap-1 shadow-xs">
            <span>🗺️</span>
            <span>Google Maps</span>
          </span>
        </div>
      </header>

      {/* ── Üzenetek ── */}
      <main className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className="msg-enter space-y-3">
            <ChatMessage role={msg.role} text={msg.text} />
            {msg.sources?.length > 0 && (
              <div className="pl-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-lake-500 uppercase tracking-wide">
                    Felhasznált helyszínek & Kedvezmények
                  </p>
                  <span className="text-[11px] text-gray-400">
                    Kattints a kártyára a térképért
                  </span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {msg.sources.map(src => (
                    <SourceCard
                      key={src.id}
                      source={src}
                      onClick={() => setSelectedPlace(src)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="msg-enter flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-lake-600 flex items-center justify-center shrink-0">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-lake-100">
              <LoadingDots />
            </div>
          </div>
        )}

        {error && (
          <div className="msg-enter bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ── Input ── */}
      <footer className="py-4 border-t border-lake-200 shrink-0">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Pl. Milyen messze van gyalog a Nagystrand? Hol van kedvezményünk?"
            disabled={loading}
            className="flex-1 rounded-xl border border-lake-200 bg-white px-4 py-3
                       text-sm text-gray-800 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-lake-400 focus:border-transparent
                       disabled:opacity-50 shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-lake-600 text-white font-semibold text-sm
                       hover:bg-lake-700 active:scale-95 transition-all shadow-sm
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Küldés
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-lake-400">
          Supabase pgvector (768 dim) · Gemini 3.8 Flash Agentic Chat · Google Maps API
        </p>
      </footer>

      {/* ── Részletek & Interaktív Google Térkép Modal ── */}
      <PlaceModal
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />

    </div>
  )
}

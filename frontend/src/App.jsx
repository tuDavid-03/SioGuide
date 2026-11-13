import { useState, useRef, useEffect } from 'react'
import ChatMessage from './components/ChatMessage'
import SourceCard from './components/SourceCard'
import LoadingDots from './components/LoadingDots'
import PlaceModal from './components/PlaceModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Web Speech API ellenőrzése
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

const WELCOME_MESSAGE = {
  role: 'assistant',
  text: 'Üdvözöllek! 🌊 Én vagyok a **SioGuide**, a Müller\'s vendégházak AI asszisztense. Kérdezz bármit Siófokról – strandok, éttermek, programok, időjárás, gyalogos távolságok vagy kedvezmények! (You can ask in English or German too!)',
  sources: [],
}

export default function App() {
  const [messages, setMessages]           = useState([WELCOME_MESSAGE])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [isListening, setIsListening]     = useState(false)
  const bottomRef                         = useRef(null)
  const inputRef                          = useRef(null)
  const recognitionRef                    = useRef(null)

  // Automatikus görgetés az utolsó üzenetre
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Mikrofon / Hangfelismerés (Web Speech API)
  function toggleListening() {
    if (!SpeechRecognition) {
      alert('A böngésződ nem támogatja a beépített hangfelismerést (SpeechRecognition). Próbáld Google Chrome vagy Edge böngészőből!')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      // Automatikus vagy magyar nyelv felismerés (a böngésző környezete szerint)
      recognition.lang = navigator.language || 'hu-HU'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript))
        }
      }

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition hiba:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
        inputRef.current?.focus()
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error('Nem sikerült elindítani a beszédfelismerőt:', err)
      setIsListening(false)
    }
  }

  async function sendMessage(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    // Ha beszéd rögzítés ment, leállítjuk
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }

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
            <span>Kedvezmények</span>
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 shadow-xs">
            <span>🎙️</span>
            <span>Hangvezérlés</span>
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 shadow-xs">
            <span>🌍</span>
            <span>HU / EN / DE</span>
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
        {/* Hallgatózási állapot jelző sáv */}
        {isListening && (
          <div className="flex items-center gap-2 mb-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-pulse shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
            <span>🎙️ Hallgatom a beszédet... Mondd el a kérdésed!</span>
            <button
              type="button"
              onClick={toggleListening}
              className="ml-auto text-rose-600 hover:text-rose-900 underline text-[11px]"
            >
              Leállítás
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? "Beszélj most..." : "Pl. Milyen messze van gyalog a Nagystrand? / What discounts do we have?"}
            disabled={loading}
            className="flex-1 rounded-xl border border-lake-200 bg-white px-4 py-3
                       text-sm text-gray-800 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-lake-400 focus:border-transparent
                       disabled:opacity-50 shadow-sm"
          />

          {/* Mikrofon Gomb (Web Speech API) */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            title={isListening ? "Diktálás leállítása" : "Beszédfelismerés / Diktálás"}
            className={`px-3.5 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center shrink-0
              ${isListening
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                : 'bg-white hover:bg-lake-50 text-lake-600 border border-lake-200 hover:border-lake-400 active:scale-95'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="text-base">{isListening ? '🛑' : '🎙️'}</span>
          </button>

          {/* Küldés Gomb */}
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
          Supabase pgvector · Gemini 3.8 Flash Agentic Chat · Web Speech API · Google Maps
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

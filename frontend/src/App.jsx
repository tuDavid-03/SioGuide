import { useState, useRef, useEffect } from 'react'
import ChatMessage from './components/ChatMessage'
import SourceCard from './components/SourceCard'
import LoadingDots from './components/LoadingDots'
import PlaceModal from './components/PlaceModal'
import SavedPlansModal from './components/SavedPlansModal'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Web Speech API ellenőrzése
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

/**
 * Böngésző nyelvének automatikus felismerése
 * - 'hu' kezdetű -> magyar
 * - 'de' kezdetű -> német
 * - egyéb -> angol ('en')
 */
function detectBrowserLanguage() {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const code = navigator.language.slice(0, 2).toLowerCase()
    if (code === 'hu') return 'hu'
    if (code === 'de') return 'de'
  }
  return 'en'
}

/**
 * Többnyelvű (HU / EN / DE) szótár a felülethez és üdvözléshez
 */
const I18N = {
  hu: {
    welcome: "Üdvözöllek! Én vagyok a **SioGuide**, a Müller's vendégházak AI asszisztense. Kérdezz bármit Siófokról – strandok, éttermek, programok, időjárás, gyalogos távolságok vagy Müller's kedvezmények!",
    placeholder: "Kérdezz valamit...",
    placeholderListening: "Beszélj most, hallgatlak...",
    send: "Küldés",
    subTitle: "Müller's Vendégházak · Agentic AI Asszisztens",
    badgeDiscounts: "Kedvezmények",
    savedPlansButton: "Mentett Tervek",
    quickDiscountQuery: "Milyen Müller's kedvezményeink vannak?",
    sourcesTitle: "Felhasznált helyszínek & Kedvezmények",
    sourcesHint: "Kattints a kártyára a térképért",
    listeningBar: "🎙️ Hallgatom a beszédet... Mondd el a kérdésed!",
    listeningStop: "Leállítás",
    speechNotSupported: "A böngésződ nem támogatja a beépített hangfelismerést (SpeechRecognition). Próbáld Google Chrome vagy Edge böngészőből!",
    splashSubtitle: "Müller's AI Concierge · Siófok",
    splashTagline: "Személyre szabott balatoni élmények & intelligens digitális asszisztens",
    splashLoading: "Asszisztens betöltése...",
    voiceTitleActive: "Diktálás leállítása",
    voiceTitleInactive: "Beszédfelismerés / Diktálás",
  },
  en: {
    welcome: "Welcome! I am **SioGuide**, the AI concierge for Müller's guesthouses. Ask me anything about Siófok – beaches, restaurants, activities, weather, walking distances, or Müller's discounts!",
    placeholder: "Ask anything...",
    placeholderListening: "Listening, please speak now...",
    send: "Send",
    subTitle: "Müller's Guesthouses · Agentic AI Concierge",
    badgeDiscounts: "Discounts",
    savedPlansButton: "Saved Plans",
    quickDiscountQuery: "What Müller's discounts do we have?",
    sourcesTitle: "Referenced Places & Partner Discounts",
    sourcesHint: "Click card for interactive map",
    listeningBar: "🎙️ Listening to speech... Ask your question!",
    listeningStop: "Stop",
    speechNotSupported: "Your browser does not support built-in speech recognition. Please try Google Chrome or Microsoft Edge!",
    splashSubtitle: "Müller's AI Concierge · Siófok",
    splashTagline: "Tailored Lake Balaton experiences & intelligent guest concierge",
    splashLoading: "Loading concierge...",
    voiceTitleActive: "Stop dictation",
    voiceTitleInactive: "Voice recognition / Dictation",
  },
  de: {
    welcome: "Herzlich willkommen! Ich bin **SioGuide**, der KI-Concierge der Müller's Gästehäuser. Frag mich gerne nach Stränden, Restaurants, Sehenswürdigkeiten, Gehdistanzen, Wetter oder Müller's Rabatten!",
    placeholder: "Frag etwas...",
    placeholderListening: "Ich höre zu, sprich bitte...",
    send: "Senden",
    subTitle: "Müller's Gästehäuser · Agentic KI-Concierge",
    badgeDiscounts: "Rabatte",
    savedPlansButton: "Gespeicherte Pläne",
    quickDiscountQuery: "Welche Müller's Rabatte gibt es?",
    sourcesTitle: "Verwendete Orte & Partner-Rabatte",
    sourcesHint: "Klicke auf die Karte für Details",
    listeningBar: "🎙️ Ich höre zu... Stelle deine Frage!",
    listeningStop: "Stopp",
    speechNotSupported: "Dein Browser unterstützt die Spracherkennung nicht. Bitte verwende Google Chrome vagy Microsoft Edge!",
    splashSubtitle: "Müller's KI-Concierge · Siófok",
    splashTagline: "Maßgeschneiderte Erlebnisse am Plattensee & digitaler Concierge",
    splashLoading: "Concierge wird gestartet...",
    voiceTitleActive: "Diktieren beenden",
    voiceTitleInactive: "Spracherkennung / Diktieren",
  },
}

export default function App() {
  // Auto-nyelvfelismerés a böngészőből
  const [currentLang, setCurrentLang]         = useState(() => detectBrowserLanguage())
  const t                                     = I18N[currentLang] || I18N.hu

  // Üzenetek állapota az indításkori felismert nyelven
  const [messages, setMessages]               = useState(() => [
    {
      role: 'assistant',
      text: (I18N[detectBrowserLanguage()] || I18N.hu).welcome,
      sources: [],
    },
  ])

  const [input, setInput]                     = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState(null)
  const [selectedPlace, setSelectedPlace]     = useState(null)
  const [isListening, setIsListening]         = useState(false)

  // Mentett tervek modális ablak állapota
  const [isSavedPlansOpen, setIsSavedPlansOpen] = useState(false)
  const [savedPlansCount, setSavedPlansCount]   = useState(0)

  // Útiterv-kosár (Trip Cart) a kiválasztott helyszínek gyűjtésére
  const [tripCart, setTripCart]                 = useState([])

  // Splash Screen állapotok (1.6s megjelenítés + 0.6s sima fade-out)
  const [showSplash, setShowSplash]           = useState(true)
  const [splashFading, setSplashFading]       = useState(false)

  const bottomRef                             = useRef(null)
  const inputRef                              = useRef(null)
  const recognitionRef                        = useRef(null)

  // Mentett tervek darabszámának inicializálása localStorage-ból
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sioguide_saved_plans') || '[]')
      setSavedPlansCount(stored.length)
    } catch {
      setSavedPlansCount(0)
    }
  }, [])

  // Splash Screen automatikus időzített eltüntetése (Gomb nélkül)
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFading(true)
    }, 1600)

    const hideTimer = setTimeout(() => {
      setShowSplash(false)
    }, 2200)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  // Automatikus görgetés az utolsó üzenetre
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Nyelvváltás kezelése
  function changeLanguage(newLang) {
    if (newLang === currentLang) return
    setCurrentLang(newLang)
    setMessages(prev => {
      // Ha még csak az első üdvözlő AI üzenet létezik, automatikusan frissítjük az új nyelvre
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', text: I18N[newLang].welcome, sources: [] }]
      }
      return prev
    })
  }

  // Terv mentése LocalStorage-ba (ChatMessage-ből hívva)
  function handleSavePlan(planText) {
    try {
      const existing = JSON.parse(localStorage.getItem('sioguide_saved_plans') || '[]')
      if (!existing.some(p => p.text === planText)) {
        const newPlan = {
          id: Date.now().toString(),
          text: planText,
          createdAt: new Date().toISOString(),
        }
        const updated = [newPlan, ...existing]
        localStorage.setItem('sioguide_saved_plans', JSON.stringify(updated))
        setSavedPlansCount(updated.length)
      }
      return true
    } catch (err) {
      console.error('Hiba a terv mentésekor:', err)
      return false
    }
  }

  // Kérdés beküldése az API-nak (űrlapból vagy gyorsgombból)
  async function submitQuestion(questionText) {
    const question = questionText.trim()
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

  // Gyorsgomb kezelése (pl. Kedvezmények lekérdezése)
  function handleQuickQuestion(queryText) {
    submitQuestion(queryText)
  }

  // Helyszín hozzáadása az útiterv-kosárhoz (Trip Cart)
  function handleAddToCart(placeName) {
    setTripCart(prev => {
      if (prev.includes(placeName)) return prev
      return [...prev, placeName]
    })
  }

  // Terv generálása a kosárba gyűjtött helyszínekből
  function handleGenerateCartPlan() {
    if (tripCart.length === 0) return
    const placesStr = tripCart.join(', ')
    setTripCart([])
    submitQuestion(`Kérlek, készíts nekem egy logikus programtervet és útvonalat az alábbi helyszínekből: ${placesStr}. Számolj sétaidőkkel és add meg a Maps linket is!`)
  }

  // Mikrofon / Hangfelismerés (Web Speech API)
  function toggleListening() {
    if (!SpeechRecognition) {
      alert(t.speechNotSupported)
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      const langMap = { hu: 'hu-HU', de: 'de-DE', en: 'en-US' }
      recognition.lang = langMap[currentLang] || navigator.language || 'hu-HU'
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

  function handleFormSubmit(e) {
    e.preventDefault()
    submitQuestion(input)
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto px-3 sm:px-4 relative">

      {/* ── Elegáns Splash Screen (Automatikus eltűnés ~1.6 - 2.2s alatt) ── */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#041a2e] via-lake-950 to-[#022b42] text-white transition-all duration-700 ease-in-out select-none ${
            splashFading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
          }`}
        >
          {/* Balatoni háttérfények */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-lake-400/15 rounded-full blur-3xl animate-pulse" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center px-6">
            {/* Hivatalos SioGuide PWA logó */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/30 ring-4 ring-white/20 animate-bounce bg-lake-950 flex items-center justify-center">
                <img
                  src="/pwa-192x192.png"
                  alt="SioGuide Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-cyan-400/20 blur-xl -z-10 animate-pulse" />
            </div>

            {/* Cím és Tipográfia */}
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2 drop-shadow-lg">
              SioGuide
            </h1>

            {/* Nyelvhű Alcím */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-lake-200 text-xs sm:text-sm font-semibold mb-3 shadow-inner">
              <span>✨</span>
              <span>{t.splashSubtitle}</span>
            </div>

            <p className="text-xs sm:text-sm text-lake-200/80 max-w-sm font-light leading-relaxed">
              {t.splashTagline}
            </p>

            {/* Töltési csík */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="w-36 h-1 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-lake-400 to-cyan-300 rounded-full animate-pulse w-full" />
              </div>
              <span className="text-[11px] text-lake-300/70 font-mono tracking-wider">
                {t.splashLoading}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Header (Reszponzív mobil + desktop) ── */}
      <header className="py-2.5 sm:py-4 border-b border-lake-200 shrink-0">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Bal oldal: Logó + Név + Rövid alcím */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-xs border border-lake-200 shrink-0 bg-lake-900">
              <img
                src="/pwa-192x192.png"
                alt="SioGuide"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-lake-900 leading-tight truncate">
                SioGuide
              </h1>
              <p className="text-[10px] sm:text-xs text-lake-500 truncate max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                {t.subTitle}
              </p>
            </div>
          </div>

          {/* Jobb oldal: Akció gombok + Nyelvváltó */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 🎁 Kedvezmények Gyorsgomb (Desktop) */}
            <button
              type="button"
              onClick={() => handleQuickQuestion(t.quickDiscountQuery)}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 transition-colors shadow-xs active:scale-95 cursor-pointer"
              title="Kérdezz rá a kedvezményekre"
            >
              <span>🎁</span>
              <span>{t.badgeDiscounts}</span>
            </button>

            {/* 🗺️ Mentett Tervek Gomb (Desktop) */}
            <button
              type="button"
              onClick={() => setIsSavedPlansOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-lake-100 hover:bg-lake-200 text-lake-800 border border-lake-200 transition-colors shadow-xs active:scale-95 cursor-pointer"
              title="Mentett programtervek megtekintése"
            >
              <span>🗺️</span>
              <span>{t.savedPlansButton}</span>
              {savedPlansCount > 0 && (
                <span className="px-1.5 py-0.2 bg-lake-600 text-white rounded-full text-[10px] font-bold">
                  {savedPlansCount}
                </span>
              )}
            </button>

            {/* Nyelvváltó gombok (HU / EN / DE) */}
            <div className="flex items-center bg-lake-100/80 rounded-xl p-0.5 sm:p-1 border border-lake-200/80 shadow-xs">
              {['hu', 'en', 'de'].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => changeLanguage(l)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all ${
                    currentLang === l
                      ? 'bg-white text-lake-800 shadow-xs scale-100'
                      : 'text-lake-600 hover:text-lake-900 opacity-70 hover:opacity-100'
                  }`}
                  title={`Nyelv: ${l.toUpperCase()}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobilon megjelenő gyorsfunkció sáv: 🎁 Kedvezmények & 🗺️ Mentett Tervek */}
        <div className="flex sm:hidden items-center gap-2 mt-2 pt-2 border-t border-lake-100/70">
          <button
            type="button"
            onClick={() => handleQuickQuestion(t.quickDiscountQuery)}
            className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <span>🎁</span>
            <span>{t.badgeDiscounts}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSavedPlansOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold py-1.5 px-2 rounded-xl bg-lake-50 hover:bg-lake-100 text-lake-800 border border-lake-200 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <span>🗺️</span>
            <span>{t.savedPlansButton}</span>
            {savedPlansCount > 0 && (
              <span className="px-1.5 py-0.2 bg-lake-600 text-white rounded-full text-[9px] font-bold">
                {savedPlansCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Üzenetek ── */}
      <main className="flex-1 overflow-y-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className="msg-enter space-y-2.5 sm:space-y-3">
            <ChatMessage
              role={msg.role}
              text={msg.text}
              onSavePlan={handleSavePlan}
            />
            {msg.sources?.length > 0 && (
              <div className="pl-2 sm:pl-10">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <p className="text-xs font-semibold text-lake-500 uppercase tracking-wide truncate">
                    {t.sourcesTitle}
                  </p>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {t.sourcesHint}
                  </span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {msg.sources.map(src => (
                    <SourceCard
                      key={src.id}
                      source={src}
                      onClick={() => setSelectedPlace(src)}
                      onAddToCart={handleAddToCart}
                      isInCart={tripCart.includes(src.name)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="msg-enter flex items-start gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden shadow-xs shrink-0 border border-lake-200/60 bg-lake-900">
              <img
                src="/pwa-192x192.png"
                alt="SioGuide"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs border border-lake-100">
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

      {/* ── Input (Mobil-optimalizált elrendezés + alsó térköz) ── */}
      <footer className="pt-2.5 pb-6 sm:pb-8 border-t border-lake-200 shrink-0 bg-lake-50/50">
        {/* ── Útiterv-Kosár (Trip Cart Bar) ── */}
        {tripCart.length > 0 && (
          <div className="mb-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-lake-950 via-lake-900 to-lake-950 text-white shadow-lg border border-lake-700/60 flex items-center justify-between gap-2 animate-scaleUp">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-full bg-cyan-400 text-lake-950 font-black text-xs flex items-center justify-center shrink-0">
                {tripCart.length}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Kiválasztva: {tripCart.length} helyszín
                </p>
                <p className="text-[10px] text-lake-300 truncate max-w-[170px] xs:max-w-[220px] sm:max-w-xs">
                  {tripCart.join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setTripCart([])}
                className="px-2 py-1 rounded-xl text-xs text-lake-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Kijelölések törlése"
              >
                Mégse
              </button>

              <button
                type="button"
                onClick={handleGenerateCartPlan}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-lake-950 font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <span>🗺️</span>
                <span>Terv Generálása</span>
              </button>
            </div>
          </div>
        )}

        {/* Hallgatózási állapot jelző sáv */}
        {isListening && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-pulse shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
            <span className="truncate">{t.listeningBar}</span>
            <button
              type="button"
              onClick={toggleListening}
              className="ml-auto text-rose-600 hover:text-rose-900 underline text-[11px] shrink-0 font-bold"
            >
              {t.listeningStop}
            </button>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isListening ? t.placeholderListening : t.placeholder}
              disabled={loading}
              className="w-full rounded-xl border border-lake-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3
                         text-xs sm:text-sm text-gray-800 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-lake-400 focus:border-transparent
                         disabled:opacity-50 shadow-xs"
            />
          </div>

          {/* Mikrofon Gomb (Web Speech API) */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            title={isListening ? t.voiceTitleActive : t.voiceTitleInactive}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-semibold text-sm transition-all shadow-xs flex items-center justify-center shrink-0
              ${isListening
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                : 'bg-white hover:bg-lake-50 text-lake-600 border border-lake-200 hover:border-lake-400 active:scale-95'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="text-base select-none">{isListening ? '🛑' : '🎙️'}</span>
          </button>

          {/* Küldés Gomb */}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="h-10 sm:h-11 px-3.5 sm:px-5 rounded-xl bg-lake-600 text-white font-semibold text-xs sm:text-sm
                       hover:bg-lake-700 active:scale-95 transition-all shadow-xs flex items-center justify-center shrink-0
                       disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{t.send}</span>
          </button>
        </form>
      </footer>

      {/* ── Részletek & Interaktív Google Térkép Modal ── */}
      <PlaceModal
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />

      {/* ── Mentett Tervek & Web Share Modal ── */}
      <SavedPlansModal
        isOpen={isSavedPlansOpen}
        onClose={() => setIsSavedPlansOpen(false)}
        onPlansChange={count => setSavedPlansCount(count)}
      />

    </div>
  )
}

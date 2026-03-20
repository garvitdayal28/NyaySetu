import { useState, useEffect, useRef } from 'react'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'

const WELCOME = {
  role: 'model',
  text: 'Hello! I am NyaySetu AI. I help migrant workers understand and file complaints about unpaid wages and labour rights violations. Tell me about your situation — what happened, and which state are you working in?',
  textHi: 'नमस्ते! मैं न्यायसेतु AI हूँ। मैं प्रवासी मजदूरों को उनके अधिकार समझने और शिकायत दर्ज करने में मदद करता हूँ। अपनी स्थिति बताएं — क्या हुआ, और आप किस राज्य में काम कर रहे हैं?',
}

export default function VoiceInput() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState('en') // 'en' | 'hi'
  const bottomRef = useRef(null)

  const { isRecording, audioBlob, error: micError, startRecording, stopRecording } =
    useVoiceRecorder()

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // When voice recording stops, transcribe then send
  useEffect(() => {
    if (audioBlob) handleVoiceBlob(audioBlob)
  }, [audioBlob])

  // Build Gemini history from messages (exclude welcome)
  function buildHistory() {
    return messages
      .filter((_, i) => i > 0) // skip welcome
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }))
  }

  async function sendMessage(text) {
    if (!text.trim()) return
    const userMsg = { role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history: buildHistory() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')
      setMessages(prev => [...prev, { role: 'model', text: data.reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  async function handleVoiceBlob(blob) {
    setLoading(true)
    try {
      const form = new FormData()
      form.append('audio', blob, 'recording.webm')
      const res = await fetch('/api/voice', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.text) throw new Error(data.error || 'Transcription failed')
      await sendMessage(data.text)
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: `Voice error: ${e.message}` }])
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const welcomeText = lang === 'hi' ? WELCOME.textHi : WELCOME.text

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-orange-700 text-base">File a Complaint</h1>
          <p className="text-xs text-gray-400">NyaySetu AI · Legal Assistant</p>
        </div>
        <button
          onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
          className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-semibold hover:bg-orange-200 transition-colors"
        >
          {lang === 'en' ? 'हिंदी' : 'English'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            role={msg.role}
            text={i === 0 ? welcomeText : msg.text}
          />
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-3 py-3">
        {micError && (
          <p className="text-xs text-red-500 mb-2 px-1">{micError}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={lang === 'hi' ? 'अपनी बात लिखें…' : 'Type your message…'}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-400 bg-gray-50 max-h-32"
            style={{ overflowY: 'auto' }}
            disabled={loading}
          />

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <SendIcon className="w-4 h-4 text-white" />
          </button>

          {/* Voice button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={e => { e.preventDefault(); startRecording() }}
            onTouchEnd={e => { e.preventDefault(); stopRecording() }}
            aria-label={isRecording ? 'Recording — release to send' : 'Hold to speak'}
            disabled={loading}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 select-none
              ${isRecording
                ? 'bg-red-500 ring-4 ring-red-200 animate-pulse scale-110'
                : 'bg-orange-100 hover:bg-orange-200 disabled:opacity-40'}`}
          >
            <MicIcon className={`w-4 h-4 ${isRecording ? 'text-white' : 'text-orange-600'}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          {isRecording
            ? (lang === 'hi' ? 'रिकॉर्ड हो रहा है… छोड़ें' : 'Recording… release to send')
            : (lang === 'hi' ? 'टाइप करें या माइक दबाकर बोलें' : 'Type or hold mic to speak')}
        </p>
      </div>
    </div>
  )
}

function ChatBubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-0.5">
          N
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-orange-500 text-white rounded-br-sm'
            : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'}`}
      >
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
        N
      </div>
      <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
    </svg>
  )
}

function SendIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

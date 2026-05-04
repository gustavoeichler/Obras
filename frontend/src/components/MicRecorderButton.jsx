import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

/**
 * On-device dictation using the Web Speech API.
 * Free, private, no backend cost. Hidden when unsupported.
 *
 * Props:
 *   onAppend(text) — called with each finalised transcript chunk.
 *   lang — BCP-47 language tag (default pt-BR).
 */
export default function MicRecorderButton({ onAppend, lang = 'pt-BR', disabled }) {
  const SR = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null

  const [listening, setListening] = useState(false)
  const recogRef = useRef(null)

  useEffect(() => () => {
    if (recogRef.current) {
      try { recogRef.current.stop() } catch {}
    }
  }, [])

  if (!SR) return null

  function start() {
    const recog = new SR()
    recog.lang = lang
    recog.continuous = true
    recog.interimResults = false
    recog.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) onAppend(r[0].transcript)
      }
    }
    recog.onend = () => setListening(false)
    recog.onerror = () => setListening(false)
    recogRef.current = recog
    recog.start()
    setListening(true)
  }

  function stop() {
    if (recogRef.current) {
      try { recogRef.current.stop() } catch {}
    }
    setListening(false)
  }

  return (
    <button
      type="button"
      className={`btn ${listening ? 'btn-primary' : 'btn-ghost'} btn-sm`}
      onClick={listening ? stop : start}
      disabled={disabled}
      title={listening ? 'Parar gravação' : 'Ditar (pt-BR)'}
    >
      {listening ? <MicOff size={14} /> : <Mic size={14} />}
      {listening ? 'Ouvindo…' : 'Ditar'}
    </button>
  )
}

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleAuth = async () => {
    setLoading(true)
    setMessage("")
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage("Bestätige deine Email und komm zurück!")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"}}>
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md mx-4 border border-white border-opacity-20">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌍</div>
          <h1 className="text-3xl font-bold text-white">Travel Archive</h1>
          <p className="text-blue-200 mt-2">Deine Reiseerinnerungen</p>
        </div>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-10 border border-white border-opacity-20 text-white placeholder-blue-200 focus:outline-none focus:border-blue-400"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white bg-opacity-10 border border-white border-opacity-20 text-white placeholder-blue-200 focus:outline-none focus:border-blue-400"
          />
          {message && <p className="text-yellow-300 text-sm text-center">{message}</p>}
          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all"
          >
            {loading ? "..." : isLogin ? "Anmelden" : "Registrieren"}
          </button>
          <p className="text-center text-blue-200 text-sm cursor-pointer hover:text-white" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Anmelden"}
          </p>
        </div>
      </div>
    </div>
  )
}

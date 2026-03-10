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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(160deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Hintergrund Effekt */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)",
        pointerEvents: "none"
      }} />

      <div style={{
        width: "100%", maxWidth: 420, margin: "0 16px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24, padding: "48px 40px",
        backdropFilter: "blur(20px)",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)"
      }}>
        {/* Logo */}
        <div style={{textAlign: "center", marginBottom: 32}}>
          <img src="/logo.png" style={{
            height: 100, width: 100, borderRadius: 20,
            margin: "0 auto 20px", display: "block",
            filter: "drop-shadow(0 4px 20px rgba(255,255,255,0.15))"
          }} />
          <h1 style={{
            color: "white", fontSize: 28, fontWeight: 700,
            margin: 0, letterSpacing: "-0.5px"
          }}>Travel Archive</h1>
          <p style={{color: "rgba(255,255,255,0.4)", marginTop: 8, fontSize: 14}}>
            Deine Reiseerinnerungen für immer
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", background: "rgba(255,255,255,0.06)",
          borderRadius: 12, padding: 4, marginBottom: 28
        }}>
          <button onClick={() => setIsLogin(true)} style={{
            flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer",
            background: isLogin ? "rgba(255,255,255,0.12)" : "transparent",
            color: isLogin ? "white" : "rgba(255,255,255,0.4)",
            fontWeight: isLogin ? 600 : 400, fontSize: 14, transition: "all 0.2s"
          }}>Anmelden</button>
          <button onClick={() => setIsLogin(false)} style={{
            flex: 1, padding: "10px", border: "none", borderRadius: 10, cursor: "pointer",
            background: !isLogin ? "rgba(255,255,255,0.12)" : "transparent",
            color: !isLogin ? "white" : "rgba(255,255,255,0.4)",
            fontWeight: !isLogin ? 600 : 400, fontSize: 14, transition: "all 0.2s"
          }}>Registrieren</button>
        </div>

        {/* Felder */}
        <div style={{display: "flex", flexDirection: "column", gap: 12}}>
          <input
            type="email"
            placeholder="Email Adresse"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              padding: "14px 16px", borderRadius: 12, fontSize: 15,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white", outline: "none"
            }}
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAuth()}
            style={{
              padding: "14px 16px", borderRadius: 12, fontSize: 15,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white", outline: "none"
            }}
          />

          {message && (
            <p style={{color: "#fbbf24", fontSize: 13, textAlign: "center", margin: 0}}>{message}</p>
          )}

          <button
            onClick={handleAuth}
            disabled={loading}
            style={{
              padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #ffffff 0%, #d4d4d4 100%)",
              color: "#0a0a0a", fontWeight: 700, fontSize: 16,
              marginTop: 4, transition: "all 0.2s",
              boxShadow: "0 4px 20px rgba(255,255,255,0.15)"
            }}
          >
            {loading ? "..." : isLogin ? "Anmelden →" : "Konto erstellen →"}
          </button>
        </div>

        <p style={{
          textAlign: "center", color: "rgba(255,255,255,0.25)",
          fontSize: 12, marginTop: 28, marginBottom: 0
        }}>
          Deine Erinnerungen. Sicher gespeichert. ✈️
        </p>
      </div>
    </div>
  )
}

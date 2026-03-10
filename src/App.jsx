import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import Auth from "./pages/Auth"
import Dashboard from "./pages/Dashboard"

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"}}>
      <div className="text-6xl">🌍</div>
    </div>
  )

  if (!session) return <Auth />

  return <Dashboard session={session} />
}

export default App
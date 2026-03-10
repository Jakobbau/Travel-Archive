import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import Auth from "./pages/Auth"

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
      <div className="text-white text-4xl">🌍</div>
    </div>
  )

  if (!session) return <Auth />

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"}}>
      <div className="text-center text-white">
        <div className="text-6xl mb-4">🌍</div>
        <h1 className="text-3xl font-bold">Willkommen bei Travel Archive!</h1>
        <p className="text-blue-200 mt-2">{session.user.email}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-white transition-all"
        >
          Abmelden
        </button>
      </div>
    </div>
  )
}

export default App

import { useState, useEffect } from "react"
import { supabase } from "./lib/supabase"
import Auth from "./pages/Auth"
import Dashboard from "./pages/Dashboard"
import Profile from "./pages/Profile"
import TripDetail from "./pages/TripDetail"
import Sidebar from "./components/Sidebar"

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  const navigateToTrip = (trip) => {
    setSelectedTrip(trip)
  }

  if (loading) return (
    <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)"}}>
      <div style={{textAlign:"center"}}>
        <img src="/logo.png" style={{height:80, width:80, borderRadius:16, marginBottom:16}} />
        <div style={{color:"var(--text-soft)", fontSize:14}}>Wird geladen...</div>
      </div>
    </div>
  )

  if (!session) return <Auth />

  if (selectedTrip) return (
    <div style={{display:"flex", minHeight:"100vh"}}>
      <Sidebar currentPage={currentPage} setCurrentPage={(page) => { setCurrentPage(page); setSelectedTrip(null) }} session={session} />
      <div style={{flex:1, overflowY:"auto"}}>
        <TripDetail trip={selectedTrip} session={session} onBack={() => setSelectedTrip(null)} />
      </div>
    </div>
  )

  const renderPage = () => {
    switch(currentPage) {
      case "dashboard":
      case "trips":
        return <Dashboard session={session} onSelectTrip={navigateToTrip} />
      case "profile":
        return <Profile session={session} viewUserId={selectedProfile} onSelectTrip={navigateToTrip} />
      default:
        return (
          <div className="main" style={{textAlign:"center", paddingTop:80}}>
            <div style={{fontSize:64, marginBottom:16}}>🚧</div>
            <h2 style={{color:"white", marginBottom:8}}>Kommt bald!</h2>
            <p style={{color:"var(--text-soft)"}}>Diese Seite wird gerade gebaut.</p>
          </div>
        )
    }
  }

  return (
    <div style={{display:"flex", minHeight:"100vh"}}>
      <Sidebar currentPage={currentPage} setCurrentPage={(page) => { setCurrentPage(page); setSelectedProfile(null) }} session={session} />
      <div style={{flex:1, overflowY:"auto"}}>
        {renderPage()}
      </div>
    </div>
  )
}

export default App
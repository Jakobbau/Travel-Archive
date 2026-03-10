import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function Dashboard({ session }) {
  const [trips, setTrips] = useState([])
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [newTrip, setNewTrip] = useState({ title: "", destination: "", start_date: "", end_date: "" })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchTrips() }, [])

  const fetchTrips = async () => {
    const { data } = await supabase.from("trips").select("*").order("created_at", { ascending: false })
    if (data) setTrips(data)
  }

  const createTrip = async () => {
    if (!newTrip.title) return
    setLoading(true)
    const { error } = await supabase.from("trips").insert([{ ...newTrip, created_by: session.user.id }])
    if (!error) { fetchTrips(); setShowNewTrip(false); setNewTrip({ title: "", destination: "", start_date: "", end_date: "" }) }
    setLoading(false)
  }

  return (
    <div>
      <div className="header">
        <div className="header-left">
          <span style={{fontSize: 28}}>🌍</span>
          <h1>Travel Archive</h1>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span className="header-email">{session.user.email}</span>
          <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Abmelden</button>
        </div>
      </div>

      <div className="main">
        <h2>Deine Reisen ✈️</h2>
        <p>Halte deine schönsten Erinnerungen fest</p>

        <button className="btn-add" onClick={() => setShowNewTrip(true)}>+ Neue Reise hinzufügen</button>

        {showNewTrip && (
          <div className="card">
            <h3>🗺️ Neue Reise</h3>
            <input placeholder="Titel (z.B. Sommerurlaub Italien 2024)" value={newTrip.title} onChange={e => setNewTrip({...newTrip, title: e.target.value})} />
            <input placeholder="Ziel (z.B. Rom, Italien)" value={newTrip.destination} onChange={e => setNewTrip({...newTrip, destination: e.target.value})} />
            <div className="date-row">
              <input type="date" value={newTrip.start_date} onChange={e => setNewTrip({...newTrip, start_date: e.target.value})} />
              <input type="date" value={newTrip.end_date} onChange={e => setNewTrip({...newTrip, end_date: e.target.value})} />
            </div>
            <div className="btn-row">
              <button className="btn-save" onClick={createTrip} disabled={loading}>{loading ? "..." : "Reise erstellen ✈️"}</button>
              <button className="btn-cancel" onClick={() => setShowNewTrip(false)}>Abbrechen</button>
            </div>
          </div>
        )}

        <div>
          {trips.length === 0 && (
            <div className="empty">
              <div>🗺️</div>
              <p>Noch keine Reisen – füge deine erste hinzu!</p>
            </div>
          )}
          {trips.map(trip => (
            <div key={trip.id} className="trip-card">
              <div>
                <div className="trip-title">✈️ {trip.title}</div>
                {trip.destination && <div className="trip-dest">📍 {trip.destination}</div>}
                {trip.start_date && <div className="trip-date">📅 {trip.start_date} → {trip.end_date}</div>}
              </div>
              <div className="trip-icon">🌴</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

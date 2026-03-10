import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

const TRIP_EMOJIS = [
  "🏖️", "🏔️", "🌆", "🗺️", "🌴", "🏛️", "🌊", "🏕️",
  "🗼", "🗽", "🏯", "🕌", "⛩️", "🌋", "🏝️", "🌅",
  "🚢", "✈️", "🚂", "🚗", "🏂", "🤿", "🧗", "🦁",
  "🍜", "🍷", "🎭", "🎪", "🎡", "🎠", "🌸", "❄️"
]

export default function Dashboard({ session }) {
  const [trips, setTrips] = useState([])
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [newTrip, setNewTrip] = useState({ title: "", destination: "", start_date: "", end_date: "", emoji: "✈️" })
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
    if (!error) { fetchTrips(); setShowNewTrip(false); setNewTrip({ title: "", destination: "", start_date: "", end_date: "", emoji: "✈️" }) }
    setLoading(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <img src="/logo.png" style={{height: 36, width: 36, borderRadius: 8}} />
          <h1>Travel Archive</h1>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span className="header-email">{session.user.email}</span>
          <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Abmelden</button>
        </div>
      </div>

      <div className="main">
        {/* Banner */}
        <div style={{
          background: "linear-gradient(135deg, rgba(8,145,178,0.15) 0%, rgba(5,150,105,0.15) 100%)",
          border: "1px solid rgba(8,145,178,0.2)",
          borderRadius: 20, padding: "32px", marginBottom: 32,
          position: "relative", overflow: "hidden"
        }}>
          <div style={{position:"absolute", top:-20, right:-20, fontSize:120, opacity:0.08, transform:"rotate(-15deg)"}}>✈️</div>
          <h2 className="page-title">Willkommen zurück! 👋</h2>
          <p className="page-subtitle" style={{marginBottom:0}}>
            {trips.length === 0 ? "Starte deine erste Reise und halte Erinnerungen fest" : `Du hast ${trips.length} Reise${trips.length !== 1 ? "n" : ""} archiviert`}
          </p>
        </div>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-number">{trips.length}</div>
            <div className="stat-label">✈️ Reisen</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {trips.filter(t => t.start_date && t.end_date).reduce((acc, t) => {
                const diff = Math.ceil((new Date(t.end_date) - new Date(t.start_date)) / (1000*60*60*24))
                return acc + diff
              }, 0)}
            </div>
            <div className="stat-label">📅 Reisetage</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{[...new Set(trips.filter(t => t.destination).map(t => t.destination))].length}</div>
            <div className="stat-label">📍 Ziele</div>
          </div>
        </div>

        {/* Neue Reise Button */}
        <button className="btn-add" onClick={() => setShowNewTrip(true)}>
          <span style={{fontSize:20}}>+</span>
          <span>Neue Reise hinzufügen</span>
        </button>

        {/* Formular */}
        {showNewTrip && (
          <div className="form-card">
            <h3>🗺️ Neue Reise erstellen</h3>

            {/* Emoji Auswahl */}
            <div style={{marginBottom: 16}}>
              <div className="date-label" style={{marginBottom: 8}}>Reise-Emoji wählen</div>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  fontSize: 36, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: "8px 16px", cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {newTrip.emoji}
              </button>
              <span style={{color: "var(--text-soft)", fontSize: 13, marginLeft: 12}}>
                Klicke um ein Emoji auszuwählen
              </span>

              {showEmojiPicker && (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(8, 1fr)",
                  gap: 8, marginTop: 12,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border)",
                  borderRadius: 12, padding: 12
                }}>
                  {TRIP_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => { setNewTrip({...newTrip, emoji}); setShowEmojiPicker(false) }}
                      style={{
                        fontSize: 28, background: newTrip.emoji === emoji ? "rgba(8,145,178,0.3)" : "transparent",
                        border: newTrip.emoji === emoji ? "1px solid var(--teal)" : "1px solid transparent",
                        borderRadius: 8, padding: "6px", cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              placeholder="Titel (z.B. Sommerurlaub Kroatien 2025)"
              value={newTrip.title}
              onChange={e => setNewTrip({...newTrip, title: e.target.value})}
            />
            <input
              placeholder="Reiseziel (z.B. Split, Kroatien)"
              value={newTrip.destination}
              onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
            />
            <div className="date-row">
              <div style={{flex:1}}>
                <div className="date-label">Startdatum</div>
                <input type="date" value={newTrip.start_date} onChange={e => setNewTrip({...newTrip, start_date: e.target.value})} />
              </div>
              <div style={{flex:1}}>
                <div className="date-label">Enddatum</div>
                <input type="date" value={newTrip.end_date} onChange={e => setNewTrip({...newTrip, end_date: e.target.value})} />
              </div>
            </div>
            <div className="btn-row">
              <button className="btn-primary" onClick={createTrip} disabled={loading}>
                {loading ? "Wird gespeichert..." : "Reise erstellen ✈️"}
              </button>
              <button className="btn-secondary" onClick={() => setShowNewTrip(false)}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Reisen Liste */}
        {trips.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🗺️</div>
            <h3>Noch keine Reisen</h3>
            <p>Füge deine erste Reise hinzu und beginne dein Archiv!</p>
          </div>
        ) : (
          trips.map(trip => (
            <div key={trip.id} className="trip-card">
              <div>
                <div className="trip-badge">Reise</div>
                <div className="trip-title">{trip.title}</div>
                {trip.destination && <div className="trip-dest">📍 {trip.destination}</div>}
                {trip.start_date && (
                  <div className="trip-date">
                    📅 {new Date(trip.start_date).toLocaleDateString("de-DE", {day:"2-digit", month:"short", year:"numeric"})}
                    {trip.end_date && ` → ${new Date(trip.end_date).toLocaleDateString("de-DE", {day:"2-digit", month:"short", year:"numeric"})}`}
                  </div>
                )}
              </div>
              <div className="trip-icon">{trip.emoji || "✈️"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

const TRIP_EMOJIS = [
  "🏖️", "🏔️", "🌆", "🗺️", "🌴", "🏛️", "🌊", "🏕️",
  "🗼", "🗽", "🏯", "🕌", "⛩️", "🌋", "🏝️", "🌅",
  "🚢", "✈️", "🚂", "🚗", "🏂", "🤿", "🧗", "🦁",
  "🍜", "🍷", "🎭", "🎪", "🎡", "🎠", "🌸", "❄️"
]

export default function Dashboard({ session, onSelectTrip }) {
  const [trips, setTrips] = useState([])
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [newTrip, setNewTrip] = useState({ title: "", destination: "", start_date: "", end_date: "", emoji: "✈️", no_end_date: false })
  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joinMessage, setJoinMessage] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)

  useEffect(() => { fetchTrips() }, [])

  const fetchTrips = async () => {
    const { data: ownTrips } = await supabase.from("trips").select("*").eq("created_by", session.user.id)
    const { data: memberTrips } = await supabase.from("trip_members").select("*, trips(*)").eq("user_id", session.user.id)
    const joined = memberTrips ? memberTrips.map(m => m.trips).filter(Boolean) : []
    const all = [...(ownTrips || []), ...joined]
    const unique = all.filter((t, i, self) => self.findIndex(x => x.id === t.id) === i)
    setTrips(unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }

  const createTrip = async () => {
    if (!newTrip.title) return
    setLoading(true)
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from("trips").insert([{
      title: newTrip.title,
      destination: newTrip.destination,
      emoji: newTrip.emoji,
      start_date: newTrip.start_date || null,
      end_date: newTrip.no_end_date ? null : (newTrip.end_date || null),
      created_by: session.user.id,
      invite_code,
      is_shared: true
    }]).select().single()
    if (!error && data) {
      await supabase.from("trip_members").insert([{ trip_id: data.id, user_id: session.user.id, role: "admin" }])
      fetchTrips()
      setShowNewTrip(false)
      setNewTrip({ title: "", destination: "", start_date: "", end_date: "", emoji: "✈️", no_end_date: false })
    }
    setLoading(false)
  }

  const joinTrip = async () => {
    if (!joinCode) return
    setJoinLoading(true)
    setJoinMessage("")
    const { data, error } = await supabase.from("trips").select("*").eq("invite_code", joinCode.toUpperCase()).single()
    if (error || !data) {
      setJoinMessage("❌ Ungültiger Einladungscode!")
    } else {
      const { error: joinError } = await supabase.from("trip_members").insert([{ trip_id: data.id, user_id: session.user.id, role: "member" }])
      if (joinError) setJoinMessage("❌ Du bist bereits dabei!")
      else { setJoinMessage("✅ Erfolgreich beigetreten!"); fetchTrips(); setJoinCode("") }
    }
    setJoinLoading(false)
  }

  const formatDate = (date) => date ? new Date(date).toLocaleDateString("de-DE", {day:"2-digit", month:"short", year:"numeric"}) : null

  return (
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

      {/* Aktionen */}
      <div style={{display:"flex", gap:12, marginBottom:24, flexWrap:"wrap"}}>
        <button className="btn-add" style={{flex:1, minWidth:200, marginBottom:0}} onClick={() => setShowNewTrip(!showNewTrip)}>
          <span style={{fontSize:20}}>+</span>
          <span>Neue Reise erstellen</span>
        </button>
        <div style={{flex:1, minWidth:200, display:"flex", gap:8}}>
          <input
            placeholder="Einladungscode eingeben..."
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            style={{
              flex:1, padding:"13px 16px", borderRadius:10,
              background:"rgba(255,255,255,0.05)",
              border:"1px solid var(--border)",
              color:"white", fontSize:14, outline:"none"
            }}
          />
          <button className="btn-secondary" onClick={joinTrip} disabled={joinLoading}>
            {joinLoading ? "..." : "Beitreten"}
          </button>
        </div>
      </div>

      {joinMessage && (
        <div style={{
          padding:"12px 16px", borderRadius:10, marginBottom:16,
          background: joinMessage.includes("✅") ? "rgba(5,150,105,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${joinMessage.includes("✅") ? "rgba(5,150,105,0.3)" : "rgba(239,68,68,0.3)"}`,
          color:"white", fontSize:14
        }}>{joinMessage}</div>
      )}

      {/* Formular */}
      {showNewTrip && (
        <div className="form-card">
          <h3>✈️ Neue Reise erstellen</h3>
          <div style={{marginBottom:16}}>
            <div className="date-label" style={{marginBottom:8}}>Reise-Emoji wählen</div>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{
              fontSize:36, background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:12, padding:"8px 16px", cursor:"pointer"
            }}>{newTrip.emoji}</button>
            <span style={{color:"var(--text-soft)", fontSize:13, marginLeft:12}}>Klicke um zu ändern</span>
            {showEmojiPicker && (
              <div style={{
                display:"grid", gridTemplateColumns:"repeat(8, 1fr)",
                gap:8, marginTop:12, background:"rgba(0,0,0,0.3)",
                border:"1px solid var(--border)", borderRadius:12, padding:12
              }}>
                {TRIP_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => { setNewTrip({...newTrip, emoji}); setShowEmojiPicker(false) }} style={{
                    fontSize:28, background: newTrip.emoji === emoji ? "rgba(8,145,178,0.3)" : "transparent",
                    border: newTrip.emoji === emoji ? "1px solid var(--teal)" : "1px solid transparent",
                    borderRadius:8, padding:6, cursor:"pointer"
                  }}>{emoji}</button>
                ))}
              </div>
            )}
          </div>
          <input placeholder="Titel (z.B. Sommerurlaub Kroatien 2025)" value={newTrip.title} onChange={e => setNewTrip({...newTrip, title: e.target.value})} />
          <input placeholder="Reiseziel (z.B. Split, Kroatien)" value={newTrip.destination} onChange={e => setNewTrip({...newTrip, destination: e.target.value})} />
          <div className="date-label" style={{marginBottom:6}}>Startdatum</div>
          <input type="date" value={newTrip.start_date} onChange={e => setNewTrip({...newTrip, start_date: e.target.value})} style={{marginBottom:12}} />

          {/* Kein Enddatum Checkbox */}
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:10}}>
            <input type="checkbox" id="noEndDate" checked={newTrip.no_end_date}
              onChange={e => setNewTrip({...newTrip, no_end_date: e.target.checked, end_date: ""})}
              style={{width:18, height:18, cursor:"pointer", accentColor:"var(--teal)"}}
            />
            <label htmlFor="noEndDate" style={{color:"var(--text-soft)", fontSize:14, cursor:"pointer"}}>
              🔄 Enddatum noch offen (Reise läuft noch oder unklar)
            </label>
          </div>

          {!newTrip.no_end_date && (
            <>
              <div className="date-label" style={{marginBottom:6}}>Enddatum</div>
              <input type="date" value={newTrip.end_date} onChange={e => setNewTrip({...newTrip, end_date: e.target.value})} />
            </>
          )}

          <div className="btn-row" style={{marginTop:16}}>
            <button className="btn-primary" onClick={createTrip} disabled={loading}>
              {loading ? "Wird erstellt..." : "Reise erstellen ✈️"}
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
          <p>Erstelle eine Reise oder tritt einer mit einem Einladungscode bei!</p>
        </div>
      ) : (
        trips.map(trip => (
          <div key={trip.id} className="trip-card" onClick={() => onSelectTrip && onSelectTrip(trip)}>
            <div>
              <div className="trip-badge">{trip.created_by === session.user.id ? "Meine Reise" : "Eingeladen"}</div>
              <div className="trip-title">{trip.title}</div>
              {trip.destination && <div className="trip-dest">📍 {trip.destination}</div>}
              <div className="trip-date">
                {trip.start_date && `📅 ${formatDate(trip.start_date)}`}
                {trip.start_date && (trip.end_date ? ` → ${formatDate(trip.end_date)}` : " → 🔄 Offen")}
              </div>
              {trip.invite_code && trip.created_by === session.user.id && (
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:6, marginTop:8,
                  padding:"4px 12px", background:"rgba(8,145,178,0.1)",
                  border:"1px solid rgba(8,145,178,0.2)", borderRadius:20
                }}>
                  <span style={{color:"var(--text-soft)", fontSize:12}}>Code:</span>
                  <span style={{color:"var(--teal-light)", fontSize:13, fontWeight:700, letterSpacing:2}}>{trip.invite_code}</span>
                </div>
              )}
            </div>
            <div className="trip-icon">{trip.emoji || "✈️"}</div>
          </div>
        ))
      )}
    </div>
  )
}

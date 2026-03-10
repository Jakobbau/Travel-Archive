import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

const AVATARS = ["🧳", "🌍", "✈️", "🏄", "🧗", "🤿", "🎒", "🚵", "🏕️", "🛶", "🌺", "🦋", "🐬", "🦅", "🌊", "🏔️"]
const COLORS = ["#0891b2", "#059669", "#7c3aed", "#dc2626", "#d97706", "#db2777", "#0284c7", "#16a34a"]

export default function Profile({ session }) {
  const [profile, setProfile] = useState({ username: "", bio: "", avatar_emoji: "🧳", avatar_color: "#0891b2" })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()
    if (data) setProfile(data)
  }

  const saveProfile = async () => {
    setLoading(true)
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      ...profile,
      updated_at: new Date()
    })
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setLoading(false)
  }

  return (
    <div className="main">
      <h2 className="page-title">Mein Profil 👤</h2>
      <p className="page-subtitle">Personalisiere deinen Travel Archive Account</p>

      {/* Avatar */}
      <div className="form-card" style={{textAlign:"center", marginBottom:24}}>
        <div
          onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          style={{
            width:100, height:100, borderRadius:"50%",
            background: profile.avatar_color,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:48, margin:"0 auto 16px", cursor:"pointer",
            border:"3px solid rgba(255,255,255,0.1)",
            transition:"all 0.2s", boxShadow:`0 8px 30px ${profile.avatar_color}40`
          }}
        >
          {profile.avatar_emoji}
        </div>
        <p style={{color:"var(--text-soft)", fontSize:13, marginBottom:16}}>
          Klicke auf den Avatar um ihn zu ändern
        </p>

        {showAvatarPicker && (
          <div>
            {/* Emoji Auswahl */}
            <div style={{marginBottom:16}}>
              <div className="date-label" style={{marginBottom:8, textAlign:"left"}}>Avatar Emoji</div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(8, 1fr)", gap:8}}>
                {AVATARS.map(emoji => (
                  <button key={emoji} onClick={() => setProfile({...profile, avatar_emoji: emoji})}
                    style={{
                      fontSize:28, padding:8, borderRadius:10, cursor:"pointer",
                      background: profile.avatar_emoji === emoji ? "rgba(8,145,178,0.3)" : "rgba(255,255,255,0.05)",
                      border: profile.avatar_emoji === emoji ? "1px solid var(--teal)" : "1px solid transparent",
                      transition:"all 0.15s"
                    }}
                  >{emoji}</button>
                ))}
              </div>
            </div>

            {/* Farb Auswahl */}
            <div>
              <div className="date-label" style={{marginBottom:8, textAlign:"left"}}>Avatar Farbe</div>
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                {COLORS.map(color => (
                  <button key={color} onClick={() => setProfile({...profile, avatar_color: color})}
                    style={{
                      width:36, height:36, borderRadius:"50%",
                      background:color, border: profile.avatar_color === color ? "3px solid white" : "3px solid transparent",
                      cursor:"pointer", transition:"all 0.15s"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profil Felder */}
      <div className="form-card">
        <h3>Profil Informationen</h3>
        <div className="date-label" style={{marginBottom:6}}>Benutzername</div>
        <input
          placeholder="z.B. jakob_reist"
          value={profile.username || ""}
          onChange={e => setProfile({...profile, username: e.target.value})}
        />
        <div className="date-label" style={{marginBottom:6, marginTop:4}}>Email</div>
        <input value={session.user.email} disabled style={{opacity:0.5, cursor:"not-allowed"}} />
        <div className="date-label" style={{marginBottom:6, marginTop:4}}>Über mich</div>
        <textarea
          placeholder="Erzähl etwas über dich und deine Reiseleideschaft..."
          value={profile.bio || ""}
          onChange={e => setProfile({...profile, bio: e.target.value})}
          rows={3}
          style={{
            width:"100%", padding:"13px 16px",
            background:"rgba(255,255,255,0.05)",
            border:"1px solid var(--border)",
            borderRadius:10, color:"white", fontSize:14,
            outline:"none", resize:"vertical", marginBottom:12,
            fontFamily:"inherit"
          }}
        />
        <button className="btn-primary" onClick={saveProfile} disabled={loading}>
          {saved ? "✅ Gespeichert!" : loading ? "Wird gespeichert..." : "Profil speichern"}
        </button>
      </div>

      {/* Stats */}
      <div className="form-card">
        <h3>Deine Statistiken 📊</h3>
        <div style={{color:"var(--text-soft)", fontSize:14}}>
          <p>📧 Mitglied seit: {new Date(session.user.created_at).toLocaleDateString("de-DE", {day:"2-digit", month:"long", year:"numeric"})}</p>
        </div>
      </div>
    </div>
  )
}

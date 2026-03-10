import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

const GROUP_EMOJIS = ["👨‍👩‍👧‍👦", "👫", "👬", "👭", "🧑‍🤝‍🧑", "🎒", "🏕️", "✈️", "🌍", "🎉", "🏖️", "🏔️"]

export default function Groups({ session }) {
  const [groups, setGroups] = useState([])
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: "", description: "", emoji: "👨‍👩‍👧‍👦" })
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinMessage, setJoinMessage] = useState("")

  useEffect(() => { fetchGroups() }, [])

  const fetchGroups = async () => {
    const { data } = await supabase
      .from("group_members")
      .select("*, groups(*)")
      .eq("user_id", session.user.id)
    if (data) setGroups(data.map(d => d.groups).filter(Boolean))
  }

  const createGroup = async () => {
    if (!newGroup.name) return
    setLoading(true)
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from("groups").insert([{
      ...newGroup,
      created_by: session.user.id,
      invite_code: inviteCode
    }]).select().single()

    if (!error && data) {
      await supabase.from("group_members").insert([{
        group_id: data.id,
        user_id: session.user.id,
        role: "admin"
      }])
      fetchGroups()
      setShowNewGroup(false)
      setNewGroup({ name: "", description: "", emoji: "👨‍👩‍👧‍👦" })
    }
    setLoading(false)
  }

  const joinGroup = async () => {
    if (!inviteCode) return
    setJoinLoading(true)
    setJoinMessage("")
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .single()

    if (error || !data) {
      setJoinMessage("❌ Ungültiger Einladungscode!")
    } else {
      const { error: joinError } = await supabase.from("group_members").insert([{
        group_id: data.id,
        user_id: session.user.id,
        role: "member"
      }])
      if (joinError) setJoinMessage("❌ Du bist bereits Mitglied dieser Gruppe!")
      else { setJoinMessage("✅ Erfolgreich beigetreten!"); fetchGroups(); setInviteCode("") }
    }
    setJoinLoading(false)
  }

  return (
    <div className="main">
      <h2 className="page-title">Gruppen 👥</h2>
      <p className="page-subtitle">Teile Reisen mit Familie und Freunden</p>

      {/* Aktionen */}
      <div style={{display:"flex", gap:12, marginBottom:24, flexWrap:"wrap"}}>
        <button className="btn-primary" style={{flex:1, minWidth:200}} onClick={() => setShowNewGroup(!showNewGroup)}>
          + Neue Gruppe erstellen
        </button>
        <div style={{flex:1, minWidth:200, display:"flex", gap:8}}>
          <input
            placeholder="Einladungscode eingeben..."
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            style={{
              flex:1, padding:"13px 16px", borderRadius:10,
              background:"rgba(255,255,255,0.05)",
              border:"1px solid var(--border)",
              color:"white", fontSize:14, outline:"none"
            }}
          />
          <button className="btn-secondary" onClick={joinGroup} disabled={joinLoading}>
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

      {/* Neue Gruppe Formular */}
      {showNewGroup && (
        <div className="form-card">
          <h3>👥 Neue Gruppe erstellen</h3>

          {/* Emoji */}
          <div style={{marginBottom:16}}>
            <div className="date-label" style={{marginBottom:8}}>Gruppen-Emoji</div>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{
              fontSize:36, background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:12, padding:"8px 16px", cursor:"pointer"
            }}>{newGroup.emoji}</button>
            {showEmojiPicker && (
              <div style={{
                display:"grid", gridTemplateColumns:"repeat(6, 1fr)",
                gap:8, marginTop:12, background:"rgba(0,0,0,0.3)",
                border:"1px solid var(--border)", borderRadius:12, padding:12
              }}>
                {GROUP_EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => { setNewGroup({...newGroup, emoji}); setShowEmojiPicker(false) }} style={{
                    fontSize:28, background: newGroup.emoji === emoji ? "rgba(8,145,178,0.3)" : "transparent",
                    border: newGroup.emoji === emoji ? "1px solid var(--teal)" : "1px solid transparent",
                    borderRadius:8, padding:6, cursor:"pointer"
                  }}>{emoji}</button>
                ))}
              </div>
            )}
          </div>

          <input
            placeholder="Gruppenname (z.B. Familie Müller)"
            value={newGroup.name}
            onChange={e => setNewGroup({...newGroup, name: e.target.value})}
          />
          <input
            placeholder="Beschreibung (optional)"
            value={newGroup.description}
            onChange={e => setNewGroup({...newGroup, description: e.target.value})}
          />
          <div className="btn-row">
            <button className="btn-primary" onClick={createGroup} disabled={loading}>
              {loading ? "Wird erstellt..." : "Gruppe erstellen 👥"}
            </button>
            <button className="btn-secondary" onClick={() => setShowNewGroup(false)}>Abbrechen</button>
          </div>
        </div>
      )}

      {/* Gruppen Liste */}
      {groups.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👥</div>
          <h3>Noch keine Gruppen</h3>
          <p>Erstelle eine Gruppe oder tritt einer mit einem Einladungscode bei!</p>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.id} className="trip-card">
            <div>
              <div className="trip-badge">Gruppe</div>
              <div className="trip-title">{group.emoji} {group.name}</div>
              {group.description && <div className="trip-dest">{group.description}</div>}
              <div style={{
                display:"inline-flex", alignItems:"center", gap:6,
                marginTop:8, padding:"4px 12px",
                background:"rgba(8,145,178,0.1)",
                border:"1px solid rgba(8,145,178,0.2)",
                borderRadius:20
              }}>
                <span style={{color:"var(--text-soft)", fontSize:12}}>Einladungscode:</span>
                <span style={{color:"var(--teal-light)", fontSize:13, fontWeight:700, letterSpacing:2}}>
                  {group.invite_code}
                </span>
              </div>
            </div>
            <div style={{fontSize:48}}>{group.emoji}</div>
          </div>
        ))
      )}
    </div>
  )
}

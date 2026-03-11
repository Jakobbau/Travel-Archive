import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

const REACTIONS = ["❤️", "😂", "😍", "🔥", "👏", "😮", "😢", "🎉"]
const TRIP_EMOJIS = ["🏖️","🏔️","🌆","🗺️","🌴","🏛️","🌊","🏕️","🗼","🗽","🏯","🕌","⛩️","🌋","🏝️","🌅","🚢","✈️","🚂","🚗","🏂","🤿","🧗","🦁","🍜","🍷","🎭","🎪","🎡","🎠","🌸","❄️"]

const formatDate = (date) => date ? new Date(date).toLocaleDateString("de-DE", {day:"2-digit", month:"short", year:"numeric"}) : null
const formatTime = (ts) => new Date(ts).toLocaleTimeString("de-DE", {hour:"2-digit", minute:"2-digit"})
const formatDayLabel = (ts) => {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Heute"
  if (d.toDateString() === yesterday.toDateString()) return "Gestern"
  return d.toLocaleDateString("de-DE", {weekday:"long", day:"2-digit", month:"long", year:"numeric"})
}
const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString()

export default function TripDetail({ trip: initialTrip, session, onBack }) {
  const [trip, setTrip] = useState(initialTrip)
  const [activeTab, setActiveTab] = useState("feed")
  const [photos, setPhotos] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [editingMessage, setEditingMessage] = useState(null)
  const [editMessageText, setEditMessageText] = useState("")
  const [replyTo, setReplyTo] = useState(null)
  const [msgReactions, setMsgReactions] = useState({})
  const [showMsgReactions, setShowMsgReactions] = useState({})
  const [msgMenu, setMsgMenu] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [expandedPhoto, setExpandedPhoto] = useState(null)
  const [showReactions, setShowReactions] = useState({})
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState("")
  const [reactions, setReactions] = useState({})
  const [members, setMembers] = useState([])
  const [profiles, setProfiles] = useState({})
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeletePhoto, setShowDeletePhoto] = useState(null)
  const [showEditTrip, setShowEditTrip] = useState(false)
  const [editTrip, setEditTrip] = useState({ title: trip.title, destination: trip.destination || "", start_date: trip.start_date || "", end_date: trip.end_date || "", emoji: trip.emoji || "✈️", no_end_date: !trip.end_date })
  const [editLoading, setEditLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileInputRef = useRef()
  const chatEndRef = useRef()
  const editInputRef = useRef()
  const messageInputRef = useRef()

  useEffect(() => {
    fetchPhotos(); fetchMessages(); fetchMembers()
    const channel = supabase.channel(`trip-${trip.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `trip_id=eq.${trip.id}` },
        payload => { setMessages(prev => [...prev, payload.new]); fetchProfile(payload.new.user_id) })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `trip_id=eq.${trip.id}` },
        payload => setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages", filter: `trip_id=eq.${trip.id}` },
        payload => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" },
        () => fetchAllMsgReactions())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [trip.id])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  useEffect(() => { if (editingMessage) editInputRef.current?.focus() }, [editingMessage])

  const fetchProfile = async (userId) => {
    if (profiles[userId]) return
    const { data } = await supabase.from("profiles").select("username, avatar_emoji, avatar_color").eq("id", userId).single()
    if (data) setProfiles(prev => ({ ...prev, [userId]: data }))
  }

  const fetchProfiles = async (userIds) => {
    const unique = [...new Set(userIds)].filter(id => !profiles[id])
    if (!unique.length) return
    const { data } = await supabase.from("profiles").select("id, username, avatar_emoji, avatar_color").in("id", unique)
    if (data) { const map = {}; data.forEach(p => map[p.id] = p); setProfiles(prev => ({ ...prev, ...map })) }
  }

  const fetchPhotos = async () => {
    const { data } = await supabase.from("photos").select("*").eq("trip_id", trip.id).order("created_at", { ascending: false })
    if (data) { setPhotos(data); fetchProfiles(data.map(p => p.uploaded_by)) }
  }

  const fetchMessages = async () => {
    const { data } = await supabase.from("chat_messages").select("*").eq("trip_id", trip.id).order("created_at", { ascending: true })
    if (data) { setMessages(data); fetchProfiles(data.map(m => m.user_id)); fetchAllMsgReactions(data) }
  }

  const fetchAllMsgReactions = async (msgs) => {
    const list = msgs || messages
    if (!list.length) return
    const ids = list.map(m => m.id)
    const { data } = await supabase.from("message_reactions").select("*").in("message_id", ids)
    if (data) {
      const map = {}
      data.forEach(r => { if (!map[r.message_id]) map[r.message_id] = []; map[r.message_id].push(r) })
      setMsgReactions(map)
    }
  }

  const fetchMembers = async () => {
    const { data } = await supabase.from("trip_members").select("*").eq("trip_id", trip.id)
    if (data) { setMembers(data); fetchProfiles(data.map(m => m.user_id)) }
  }

  const fetchComments = async (photoId) => {
    const { data } = await supabase.from("photo_comments").select("*").eq("photo_id", photoId).order("created_at")
    if (data) { setComments(prev => ({ ...prev, [photoId]: data })); fetchProfiles(data.map(c => c.user_id)) }
  }

  const fetchReactions = async (photoId) => {
    const { data } = await supabase.from("photo_reactions").select("*").eq("photo_id", photoId)
    if (data) setReactions(prev => ({ ...prev, [photoId]: data }))
  }

  const uploadMedia = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      try {
        const ext = file.name.split(".").pop()
        const path = `${session.user.id}/${trip.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from("travel-media").upload(path, file)
        if (uploadError) { console.error("Storage error:", uploadError); continue }
        const { data: urlData } = supabase.storage.from("travel-media").getPublicUrl(path)
        const { error: dbError } = await supabase.from("photos").insert({ trip_id: trip.id, uploaded_by: session.user.id, url: urlData.publicUrl, is_video: file.type.startsWith("video/") })
        if (dbError) console.error("DB error:", dbError)
        else fetchPhotos()
      } catch(err) { console.error("Upload error:", err) }
    }
    setUploading(false)
  }

  const deletePhoto = async (photo) => {
    await supabase.from("photos").delete().eq("id", photo.id)
    setShowDeletePhoto(null); fetchPhotos()
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    const payload = { trip_id: trip.id, user_id: session.user.id, content: newMessage.trim() }
    if (replyTo) payload.reply_to = replyTo.id
    await supabase.from("chat_messages").insert([payload])
    setNewMessage(""); setReplyTo(null)
  }

  const saveEditMessage = async () => {
    if (!editMessageText.trim()) return
    await supabase.from("chat_messages").update({ content: editMessageText.trim(), is_edited: true }).eq("id", editingMessage.id)
    setEditingMessage(null); setEditMessageText("")
  }

const deleteMessage = async (msg) => {
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    setMsgMenu(null)
    await supabase.from("chat_messages").delete().eq("id", msg.id)
  }

  const toggleMsgReaction = async (msgId, emoji) => {
    const existing = (msgReactions[msgId] || []).find(r => r.emoji === emoji && r.user_id === session.user.id)
    if (existing) await supabase.from("message_reactions").delete().eq("id", existing.id)
    else await supabase.from("message_reactions").insert([{ message_id: msgId, user_id: session.user.id, emoji }])
    fetchAllMsgReactions()
  }

  const toggleReaction = async (photoId, emoji) => {
    const existing = (reactions[photoId] || []).find(r => r.emoji === emoji && r.user_id === session.user.id)
    if (existing) await supabase.from("photo_reactions").delete().eq("id", existing.id)
    else await supabase.from("photo_reactions").insert([{ photo_id: photoId, user_id: session.user.id, emoji }])
    fetchReactions(photoId)
  }

  const addComment = async (photoId) => {
    if (!newComment.trim()) return
    const { error } = await supabase.from("photo_comments").insert([{ photo_id: photoId, user_id: session.user.id, content: newComment.trim() }])
    if (!error) { setNewComment(""); fetchComments(photoId) }
  }

  const deleteComment = async (commentId, photoId) => {
    await supabase.from("photo_comments").delete().eq("id", commentId)
    fetchComments(photoId)
  }

  const deleteTrip = async () => {
    await supabase.from("trips").delete().eq("id", trip.id); onBack()
  }

  const saveEdit = async () => {
    setEditLoading(true)
    const { data, error } = await supabase.from("trips").update({
      title: editTrip.title, destination: editTrip.destination, emoji: editTrip.emoji,
      start_date: editTrip.start_date || null,
      end_date: editTrip.no_end_date ? null : (editTrip.end_date || null)
    }).eq("id", trip.id).select().single()
    if (!error && data) { setTrip(data); setShowEditTrip(false) }
    setEditLoading(false)
  }

  const getDisplayName = (userId) => {
    if (userId === session.user.id) return "Du"
    const p = profiles[userId]
    return p?.username || "Unbekannt"
  }

  const getAvatar = (userId) => {
    const p = profiles[userId]
    return { emoji: p?.avatar_emoji || "👤", color: p?.avatar_color || "#0891b2" }
  }

  const getReplyPreview = (msg) => {
    if (!msg.reply_to) return null
    const original = messages.find(m => m.id === msg.reply_to)
    if (!original) return null
    return { name: getDisplayName(original.user_id), text: original.content }
  }

  return (
    <div style={{display:"flex", flexDirection:"column", minHeight:"100vh"}} onClick={() => { setMsgMenu(null); setShowMenu(false) }}>

      {/* Header */}
      <div style={{padding:"16px 24px", borderBottom:"1px solid var(--border)", background:"rgba(10,22,40,0.95)", backdropFilter:"blur(20px)", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100}}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 12px", color:"white", cursor:"pointer", fontSize:16}}>← Zurück</button>
          <div>
            <div style={{color:"white", fontWeight:700, fontSize:18}}>{trip.emoji} {trip.title}</div>
            <div style={{display:"flex", gap:8, marginTop:2}}>
              {trip.destination && <span style={{color:"var(--teal-light)", fontSize:12}}>📍 {trip.destination}</span>}
              {trip.start_date && <span style={{color:"var(--text-soft)", fontSize:12}}>📅 {formatDate(trip.start_date)} {trip.end_date ? `→ ${formatDate(trip.end_date)}` : "→ 🔄 Offen"}</span>}
            </div>
          </div>
        </div>
        <div style={{position:"relative"}} onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowMenu(!showMenu)} style={{background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 14px", color:"white", cursor:"pointer", fontSize:20}}>⋮</button>
          {showMenu && (
            <div style={{position:"absolute", right:0, top:"110%", background:"#0f2040", border:"1px solid var(--border)", borderRadius:12, padding:8, minWidth:200, zIndex:200, boxShadow:"0 8px 30px rgba(0,0,0,0.5)"}}>
              {trip.created_by === session.user.id && <button onClick={() => { setShowEditTrip(true); setShowMenu(false) }} style={{width:"100%", padding:"10px 16px", background:"transparent", border:"none", color:"white", cursor:"pointer", textAlign:"left", borderRadius:8, fontSize:14}}>✏️ Reise bearbeiten</button>}
              <button onClick={() => { navigator.clipboard.writeText(trip.invite_code); setShowMenu(false) }} style={{width:"100%", padding:"10px 16px", background:"transparent", border:"none", color:"white", cursor:"pointer", textAlign:"left", borderRadius:8, fontSize:14}}>📋 Code: {trip.invite_code}</button>
              {trip.created_by === session.user.id && <button onClick={() => { setShowDeleteConfirm(true); setShowMenu(false) }} style={{width:"100%", padding:"10px 16px", background:"transparent", border:"none", color:"#f87171", cursor:"pointer", textAlign:"left", borderRadius:8, fontSize:14}}>🗑️ Reise löschen</button>}
            </div>
          )}
        </div>
      </div>

      {/* Edit Trip Modal */}
      {showEditTrip && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500}}>
          <div style={{background:"#0f2040", border:"1px solid var(--border)", borderRadius:20, padding:32, maxWidth:460, width:"90%", maxHeight:"90vh", overflowY:"auto"}}>
            <h3 style={{color:"white", marginBottom:20}}>✏️ Reise bearbeiten</h3>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{fontSize:32, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"8px 14px", cursor:"pointer", marginBottom:12}}>{editTrip.emoji}</button>
            {showEmojiPicker && (
              <div style={{display:"grid", gridTemplateColumns:"repeat(8, 1fr)", gap:6, marginBottom:12, background:"rgba(0,0,0,0.3)", border:"1px solid var(--border)", borderRadius:12, padding:10}}>
                {TRIP_EMOJIS.map(emoji => <button key={emoji} onClick={() => { setEditTrip({...editTrip, emoji}); setShowEmojiPicker(false) }} style={{fontSize:24, background:"transparent", border:"none", cursor:"pointer", padding:4, borderRadius:8}}>{emoji}</button>)}
              </div>
            )}
            {[["Titel","title"],["Reiseziel","destination"]].map(([label, key]) => (
              <div key={key}>
                <div className="date-label" style={{marginBottom:6}}>{label}</div>
                <input value={editTrip[key]} onChange={e => setEditTrip({...editTrip, [key]: e.target.value})} style={{width:"100%", padding:"12px 16px", borderRadius:10, marginBottom:12, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:14, outline:"none"}} />
              </div>
            ))}
            <div className="date-label" style={{marginBottom:6}}>Startdatum</div>
            <input type="date" value={editTrip.start_date} onChange={e => setEditTrip({...editTrip, start_date: e.target.value})} style={{width:"100%", padding:"12px 16px", borderRadius:10, marginBottom:12, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:14, outline:"none"}} />
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:10}}>
              <input type="checkbox" id="noEndEdit" checked={editTrip.no_end_date} onChange={e => setEditTrip({...editTrip, no_end_date: e.target.checked, end_date: ""})} style={{width:18, height:18, cursor:"pointer", accentColor:"var(--teal)"}} />
              <label htmlFor="noEndEdit" style={{color:"var(--text-soft)", fontSize:14, cursor:"pointer"}}>🔄 Enddatum noch offen</label>
            </div>
            {!editTrip.no_end_date && (
              <>
                <div className="date-label" style={{marginBottom:6}}>Enddatum</div>
                <input type="date" value={editTrip.end_date} onChange={e => setEditTrip({...editTrip, end_date: e.target.value})} style={{width:"100%", padding:"12px 16px", borderRadius:10, marginBottom:12, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:14, outline:"none"}} />
              </>
            )}
            <div style={{display:"flex", gap:12}}>
              <button className="btn-primary" style={{flex:1}} onClick={saveEdit} disabled={editLoading}>{editLoading ? "..." : "Speichern ✅"}</button>
              <button className="btn-secondary" onClick={() => setShowEditTrip(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Trip */}
      {showDeleteConfirm && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500}}>
          <div style={{background:"#0f2040", border:"1px solid var(--border)", borderRadius:20, padding:32, maxWidth:380, width:"90%", textAlign:"center"}}>
            <div style={{fontSize:48, marginBottom:16}}>🗑️</div>
            <h3 style={{color:"white", marginBottom:8}}>Reise löschen?</h3>
            <p style={{color:"var(--text-soft)", marginBottom:24, fontSize:14}}>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div style={{display:"flex", gap:12}}>
              <button className="btn-secondary" style={{flex:1}} onClick={() => setShowDeleteConfirm(false)}>Abbrechen</button>
              <button onClick={deleteTrip} style={{flex:1, padding:13, background:"#ef4444", color:"white", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600}}>Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Photo */}
      {showDeletePhoto && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500}}>
          <div style={{background:"#0f2040", border:"1px solid var(--border)", borderRadius:20, padding:32, maxWidth:380, width:"90%", textAlign:"center"}}>
            <div style={{fontSize:48, marginBottom:16}}>🖼️</div>
            <h3 style={{color:"white", marginBottom:8}}>Foto löschen?</h3>
            <p style={{color:"var(--text-soft)", marginBottom:24, fontSize:14}}>Das Foto wird unwiderruflich gelöscht.</p>
            <div style={{display:"flex", gap:12}}>
              <button className="btn-secondary" style={{flex:1}} onClick={() => setShowDeletePhoto(null)}>Abbrechen</button>
              <button onClick={() => deletePhoto(showDeletePhoto)} style={{flex:1, padding:13, background:"#ef4444", color:"white", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600}}>Löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex", gap:4, padding:"12px 24px", borderBottom:"1px solid var(--border)", background:"rgba(10,22,40,0.5)"}}>
        {[{id:"feed",label:"📸 Feed"},{id:"chat",label:"💬 Chat"},{id:"members",label:"👥 Mitglieder"}].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{padding:"8px 20px", borderRadius:10, border:"none", cursor:"pointer", background: activeTab === tab.id ? "linear-gradient(135deg, var(--teal), var(--green))" : "rgba(255,255,255,0.05)", color: activeTab === tab.id ? "white" : "var(--text-soft)", fontWeight: activeTab === tab.id ? 600 : 400, fontSize:14}}>{tab.label}</button>
        ))}
      </div>

      <div style={{flex:1, overflowY:"auto", padding: activeTab === "chat" ? 0 : 24}}>

        {/* FEED */}
        {activeTab === "feed" && (
          <div style={{maxWidth:600, margin:"0 auto"}}>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple capture="environment" onChange={uploadMedia} style={{display:"none"}} />
            <button className="btn-primary" style={{width:"100%", marginBottom:24}} onClick={() => fileInputRef.current.click()} disabled={uploading}>
              {uploading ? "⏳ Wird hochgeladen..." : "📸 Foto / Video hinzufügen"}
            </button>
            {photos.length === 0
              ? <div className="empty"><div className="empty-icon">📸</div><h3>Noch keine Fotos</h3><p>Füge das erste Foto hinzu!</p></div>
              : photos.map(photo => (
                <div key={photo.id} style={{background:"var(--card)", border:"1px solid var(--border)", borderRadius:20, marginBottom:20, overflow:"hidden"}}>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px"}}>
                    <div style={{display:"flex", alignItems:"center", gap:8}}>
                      <div style={{width:32, height:32, borderRadius:"50%", background: getAvatar(photo.uploaded_by).color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16}}>{getAvatar(photo.uploaded_by).emoji}</div>
                      <div>
                        <div style={{color:"white", fontSize:13, fontWeight:600}}>{getDisplayName(photo.uploaded_by)}</div>
                        <div style={{color:"var(--text-soft)", fontSize:11}}>{new Date(photo.created_at).toLocaleDateString("de-DE", {day:"2-digit", month:"short"})} · {formatTime(photo.created_at)}</div>
                      </div>
                    </div>
                    <div style={{display:"flex", gap:8}}>
                      <button onClick={async () => { const a = document.createElement("a"); a.href = photo.url; a.download = photo.is_video ? `video-${Date.now()}.mp4` : `foto-${Date.now()}.jpg`; a.target = "_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a) }} style={{background:"transparent", border:"none", color:"var(--text-soft)", cursor:"pointer", fontSize:18}}>⬇️</button>
                      {photo.uploaded_by === session.user.id && <button onClick={() => setShowDeletePhoto(photo)} style={{background:"transparent", border:"none", color:"var(--text-soft)", cursor:"pointer", fontSize:18}}>🗑️</button>}
                    </div>
                  </div>
                  {photo.is_video ? <video src={photo.url} controls style={{width:"100%", maxHeight:400, objectFit:"cover"}} /> : <img src={photo.url} alt="" style={{width:"100%", maxHeight:400, objectFit:"cover"}} />}
                  <div style={{padding:"12px 16px"}}>
                    <button onClick={() => { setShowReactions(prev => ({...prev, [photo.id]: !prev[photo.id]})); fetchReactions(photo.id) }} style={{background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", borderRadius:20, padding:"6px 14px", color:"var(--text-soft)", cursor:"pointer", fontSize:13, marginBottom:8}}>
                      😊 Reagieren {(reactions[photo.id]||[]).length > 0 && `· ${(reactions[photo.id]||[]).length}`}
                    </button>
                    {(reactions[photo.id]||[]).length > 0 && (
                      <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:8}}>
                        {REACTIONS.map(emoji => {
                          const count = (reactions[photo.id]||[]).filter(r => r.emoji === emoji).length
                          const mine = (reactions[photo.id]||[]).find(r => r.emoji === emoji && r.user_id === session.user.id)
                          if (!count) return null
                          return <button key={emoji} onClick={() => toggleReaction(photo.id, emoji)} style={{padding:"4px 10px", borderRadius:20, border: mine ? "1px solid var(--teal)" : "1px solid var(--border)", background: mine ? "rgba(8,145,178,0.2)" : "rgba(255,255,255,0.05)", cursor:"pointer", fontSize:15, color:"white"}}>{emoji} <span style={{fontSize:12}}>{count}</span></button>
                        })}
                      </div>
                    )}
                    {showReactions[photo.id] && (
                      <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:8, padding:"10px 12px", background:"rgba(0,0,0,0.3)", border:"1px solid var(--border)", borderRadius:12}}>
                        {REACTIONS.map(emoji => <button key={emoji} onClick={() => { toggleReaction(photo.id, emoji); setShowReactions(prev => ({...prev, [photo.id]: false})) }} style={{fontSize:24, background:"transparent", border:"none", cursor:"pointer", padding:"4px 6px", borderRadius:8}}>{emoji}</button>)}
                      </div>
                    )}
                    <button onClick={() => { setExpandedPhoto(expandedPhoto === photo.id ? null : photo.id); fetchComments(photo.id) }} style={{background:"transparent", border:"none", color:"var(--text-soft)", cursor:"pointer", fontSize:13}}>
                      💬 Kommentare {comments[photo.id] ? `(${comments[photo.id].length})` : ""}
                    </button>
                    {expandedPhoto === photo.id && (
                      <div style={{marginTop:10}}>
                        {(comments[photo.id]||[]).length === 0 && <p style={{color:"var(--text-muted)", fontSize:13, marginBottom:8}}>Noch keine Kommentare</p>}
                        {(comments[photo.id]||[]).map(c => (
                          <div key={c.id} style={{display:"flex", gap:8, marginBottom:8, alignItems:"flex-start"}}>
                            <div style={{width:28, height:28, borderRadius:"50%", background: getAvatar(c.user_id).color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0}}>{getAvatar(c.user_id).emoji}</div>
                            <div style={{flex:1, padding:"8px 12px", background:"rgba(255,255,255,0.05)", borderRadius:10}}>
                              <div style={{color:"var(--teal-light)", fontSize:11, fontWeight:600, marginBottom:2}}>{getDisplayName(c.user_id)}</div>
                              <div style={{color:"white", fontSize:13}}>{c.content}</div>
                              <div style={{color:"var(--text-muted)", fontSize:10, marginTop:2}}>{formatTime(c.created_at)}</div>
                            </div>
                            {c.user_id === session.user.id && (
                              <button onClick={() => deleteComment(c.id, photo.id)} style={{background:"transparent", border:"none", color:"var(--text-soft)", cursor:"pointer", fontSize:14, padding:"4px", opacity:0.6}}>🗑️</button>
                            )}
                          </div>
                        ))}
                        <div style={{display:"flex", gap:8, marginTop:8}}>
                          <input placeholder="Kommentar..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment(photo.id)} style={{flex:1, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:13, outline:"none"}} />
                          <button className="btn-primary" style={{padding:"10px 16px"}} onClick={() => addComment(photo.id)}>→</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* CHAT */}
        {activeTab === "chat" && (
          <div style={{display:"flex", flexDirection:"column", height:"calc(100vh - 180px)"}}>
            <div style={{flex:1, overflowY:"auto", padding:"16px 24px"}}>
              {messages.length === 0
                ? <div className="empty"><div className="empty-icon">💬</div><h3>Noch keine Nachrichten</h3><p>Schreibe die erste Nachricht!</p></div>
                : messages.map((msg, i) => {
                  const isMe = msg.user_id === session.user.id
                  const showDay = i === 0 || !isSameDay(messages[i-1].created_at, msg.created_at)
                  const showName = !isMe && (i === 0 || messages[i-1].user_id !== msg.user_id || showDay)
                  const avatar = getAvatar(msg.user_id)
                  const reply = getReplyPreview(msg)
                  const myMsgReactions = msgReactions[msg.id] || []

                  return (
                    <div key={msg.id}>
                      {showDay && (
                        <div style={{display:"flex", alignItems:"center", gap:12, margin:"16px 0"}}>
                          <div style={{flex:1, height:1, background:"var(--border)"}} />
                          <div style={{padding:"4px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid var(--border)", borderRadius:20, color:"var(--text-soft)", fontSize:12}}>{formatDayLabel(msg.created_at)}</div>
                          <div style={{flex:1, height:1, background:"var(--border)"}} />
                        </div>
                      )}

                      <div style={{display:"flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom:2, alignItems:"flex-end", gap:8}} onClick={e => e.stopPropagation()}>
                        {!isMe && <div style={{width:32, height:32, borderRadius:"50%", background: avatar.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0}}>{avatar.emoji}</div>}

                        <div style={{maxWidth:"70%"}}>
                          {showName && <div style={{color:"var(--teal-light)", fontSize:11, fontWeight:600, marginBottom:3, marginLeft:4}}>{getDisplayName(msg.user_id)}</div>}

                          {/* Nachricht + Hover Aktionen */}
                          <div style={{position:"relative"}}
                            onMouseEnter={e => e.currentTarget.querySelector(".msg-actions").style.opacity = "1"}
                            onMouseLeave={e => e.currentTarget.querySelector(".msg-actions").style.opacity = "0"}>

                            {/* Hover Aktionen */}
                            <div className="msg-actions" style={{position:"absolute", top:-32, [isMe?"left":"right"]:0, display:"flex", gap:4, opacity:0, transition:"opacity 0.15s", background:"#0f2040", border:"1px solid var(--border)", borderRadius:10, padding:"4px 6px", zIndex:10, whiteSpace:"nowrap"}}>
                              <button onClick={() => { setShowMsgReactions(prev => ({...prev, [msg.id]: !prev[msg.id]})) }} style={{background:"transparent", border:"none", cursor:"pointer", fontSize:14, padding:"2px 4px"}}>😊</button>
                              <button onClick={() => { setReplyTo(msg); messageInputRef.current?.focus() }} style={{background:"transparent", border:"none", cursor:"pointer", fontSize:14, padding:"2px 4px"}}>↩️</button>
                              {isMe && <>
                                <button onClick={() => { setEditingMessage(msg); setEditMessageText(msg.content); setMsgMenu(null) }} style={{background:"transparent", border:"none", cursor:"pointer", fontSize:14, padding:"2px 4px"}}>✏️</button>
                                <button onClick={() => deleteMessage(msg)} style={{background:"transparent", border:"none", cursor:"pointer", fontSize:14, padding:"2px 4px"}}>🗑️</button>
                              </>}
                            </div>

                            {/* Emoji Picker für Nachricht */}
                            {showMsgReactions[msg.id] && (
                              <div style={{position:"absolute", top:-80, [isMe?"right":"left"]:0, display:"flex", gap:4, padding:"8px 10px", background:"#0f2040", border:"1px solid var(--border)", borderRadius:12, zIndex:20, boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
                                {REACTIONS.map(emoji => (
                                  <button key={emoji} onClick={() => { toggleMsgReaction(msg.id, emoji); setShowMsgReactions(prev => ({...prev, [msg.id]: false})) }} style={{fontSize:20, background:"transparent", border:"none", cursor:"pointer", padding:"2px 4px", borderRadius:6}}>{emoji}</button>
                                ))}
                              </div>
                            )}

                            {/* Reply Vorschau */}
                            {reply && (
                              <div style={{padding:"6px 10px", background:"rgba(255,255,255,0.05)", borderLeft:"3px solid var(--teal)", borderRadius:"8px 8px 0 0", marginBottom:-4}}>
                                <div style={{color:"var(--teal-light)", fontSize:11, fontWeight:600}}>{reply.name}</div>
                                <div style={{color:"var(--text-soft)", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:200}}>{reply.text}</div>
                              </div>
                            )}

                            {/* Nachricht selbst */}
                            {editingMessage?.id === msg.id ? (
                              <div style={{display:"flex", gap:8, alignItems:"center"}}>
                                <input ref={editInputRef} value={editMessageText} onChange={e => setEditMessageText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEditMessage(); if (e.key === "Escape") setEditingMessage(null) }}
                                  style={{padding:"10px 14px", borderRadius:12, background:"rgba(255,255,255,0.1)", border:"2px solid var(--teal)", color:"white", fontSize:14, outline:"none", minWidth:200}} />
                                <button onClick={saveEditMessage} style={{background:"var(--teal)", border:"none", borderRadius:8, padding:"8px 12px", color:"white", cursor:"pointer", fontSize:13}}>✓</button>
                                <button onClick={() => setEditingMessage(null)} style={{background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"8px 12px", color:"white", cursor:"pointer", fontSize:13}}>✕</button>
                              </div>
                            ) : (
                              <div style={{padding:"10px 16px", borderRadius:18, background: isMe ? "linear-gradient(135deg, var(--teal), var(--green))" : "rgba(255,255,255,0.08)", color:"white", fontSize:14, borderBottomRightRadius: isMe ? 4 : 18, borderBottomLeftRadius: isMe ? 18 : 4}}>
                                {msg.content}
                                <div style={{display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6, marginTop:4}}>
                                  {msg.is_edited && <span style={{fontSize:10, opacity:0.5, fontStyle:"italic"}}>bearbeitet</span>}
                                  <span style={{fontSize:10, opacity:0.6}}>{formatTime(msg.created_at)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Reaktionen auf Nachricht */}
                          {myMsgReactions.length > 0 && (
                            <div style={{display:"flex", gap:4, flexWrap:"wrap", marginTop:4, justifyContent: isMe ? "flex-end" : "flex-start"}}>
                              {REACTIONS.map(emoji => {
                                const count = myMsgReactions.filter(r => r.emoji === emoji).length
                                const mine = myMsgReactions.find(r => r.emoji === emoji && r.user_id === session.user.id)
                                if (!count) return null
                                return <button key={emoji} onClick={() => toggleMsgReaction(msg.id, emoji)} style={{padding:"2px 8px", borderRadius:20, border: mine ? "1px solid var(--teal)" : "1px solid var(--border)", background: mine ? "rgba(8,145,178,0.2)" : "rgba(255,255,255,0.05)", cursor:"pointer", fontSize:13, color:"white"}}>{emoji} {count}</button>
                              })}
                            </div>
                          )}
                        </div>

                        {isMe && <div style={{width:32, height:32, borderRadius:"50%", background: avatar.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0}}>{avatar.emoji}</div>}
                      </div>
                    </div>
                  )
                })
              }
              <div ref={chatEndRef} />
            </div>

            {/* Reply Banner */}
            {replyTo && (
              <div style={{padding:"8px 24px", background:"rgba(8,145,178,0.1)", borderTop:"1px solid rgba(8,145,178,0.2)", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <div>
                  <div style={{color:"var(--teal-light)", fontSize:11, fontWeight:600}}>↩️ Antwort an {getDisplayName(replyTo.user_id)}</div>
                  <div style={{color:"var(--text-soft)", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:300}}>{replyTo.content}</div>
                </div>
                <button onClick={() => setReplyTo(null)} style={{background:"transparent", border:"none", color:"var(--text-soft)", cursor:"pointer", fontSize:18}}>✕</button>
              </div>
            )}

            {/* Chat Input */}
            <div style={{padding:"16px 24px", borderTop:"1px solid var(--border)", background:"rgba(10,22,40,0.9)", display:"flex", gap:12}}>
              <input ref={messageInputRef} placeholder="Nachricht schreiben..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
                style={{flex:1, padding:"13px 16px", borderRadius:12, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:14, outline:"none"}} />
              <button className="btn-primary" style={{padding:"13px 20px"}} onClick={sendMessage}>→</button>
            </div>
          </div>
        )}

        {/* MITGLIEDER */}
        {activeTab === "members" && (
          <div style={{maxWidth:600, margin:"0 auto"}}>
            <div className="form-card">
              <h3>👥 Mitglieder ({members.length})</h3>
              {members.map(m => {
                const avatar = getAvatar(m.user_id)
                return (
                  <div key={m.id} style={{display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid var(--border)"}}>
                    <div style={{width:44, height:44, borderRadius:"50%", background: avatar.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22}}>{avatar.emoji}</div>
                    <div>
                      <div style={{color:"white", fontSize:14, fontWeight:600}}>{getDisplayName(m.user_id)}</div>
                      <div style={{color:"var(--text-soft)", fontSize:12}}>{m.role === "admin" ? "👑 Admin" : "Mitglied"}</div>
                    </div>
                  </div>
                )
              })}
              <div style={{marginTop:16, padding:"12px 16px", background:"rgba(8,145,178,0.1)", borderRadius:12, border:"1px solid rgba(8,145,178,0.2)"}}>
                <div style={{color:"var(--text-soft)", fontSize:12, marginBottom:4}}>Einladungscode:</div>
                <div style={{color:"var(--teal-light)", fontSize:20, fontWeight:700, letterSpacing:4}}>{trip.invite_code}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
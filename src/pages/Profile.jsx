import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

const AVATAR_EMOJIS = ["👤","😎","🤩","🥳","😊","🧑‍💻","👨‍🎨","👩‍🎨","🧙","🦸","🧑‍🚀","👨‍🍳","🦊","🐻","🐼","🦁","🐯","🦋","🌟","⚡"]
const AVATAR_COLORS = ["#0891b2","#059669","#7c3aed","#db2777","#ea580c","#ca8a04","#16a34a","#2563eb","#9333ea","#e11d48"]
const ACHIEVEMENTS = [
  { type:"first_trip", emoji:"✈️", title:"Weltenbummler", desc:"Erste Reise erstellt" },
  { type:"first_photo", emoji:"📸", title:"Fotograf", desc:"Erstes Foto hochgeladen" },
  { type:"first_chat", emoji:"💬", title:"Gesprächig", desc:"Erste Nachricht gesendet" },
  { type:"first_join", emoji:"👥", title:"Teamplayer", desc:"Einer Gruppe beigetreten" },
  { type:"trips_5", emoji:"🗺️", title:"Vielreisender", desc:"5 Reisen erstellt" },
  { type:"trips_10", emoji:"🌍", title:"Globetrotter", desc:"10 Reisen erstellt" },
  { type:"countries_5", emoji:"🏳️", title:"Entdecker", desc:"5 Länder bereist" },
  { type:"countries_10", emoji:"🌐", title:"Weltreisender", desc:"10 Länder bereist" },
  { type:"photos_10", emoji:"🎞️", title:"Memories", desc:"10 Fotos hochgeladen" },
  { type:"photos_50", emoji:"🏆", title:"Profi-Fotograf", desc:"50 Fotos hochgeladen" },
  { type:"days_10", emoji:"📅", title:"Abenteurer", desc:"10 Reisetage" },
  { type:"days_50", emoji:"🎒", title:"Backpacker", desc:"50 Reisetage" },
]

export default function Profile({ session, viewUserId, onSelectTrip }) {
  const isOwnProfile = !viewUserId || viewUserId === session.user.id
  const userId = viewUserId || session.user.id
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [trips, setTrips] = useState([])
  const [photos, setPhotos] = useState([])
  const [achievements, setAchievements] = useState([])
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [activeTab, setActiveTab] = useState("photos")
  const [photoView, setPhotoView] = useState("folders")
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [expandedFolder, setExpandedFolder] = useState(null)
  const avatarInputRef = useRef()
  const coverInputRef = useRef()

  useEffect(() => { fetchAll() }, [userId])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchProfile(), fetchTrips(), fetchPhotos(), fetchAchievements(), fetchFollows()])
    setLoading(false)
  }

  const fetchProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single()
    if (data) { setProfile(data); setForm(data) }
    else {
      const empty = { id: userId, username: session.user.email?.split("@")[0], avatar_emoji: "👤", avatar_color: "#0891b2", is_private: false }
      setProfile(empty); setForm(empty)
    }
  }

  const fetchTrips = async () => {
    const { data } = await supabase.from("trips").select("*").eq("created_by", userId).order("created_at", { ascending: false })
    if (data) setTrips(data)
  }

  const fetchPhotos = async () => {
    const { data } = await supabase.from("photos").select("*").eq("uploaded_by", userId).order("created_at", { ascending: false })
    if (data) setPhotos(data)
  }

  const fetchAchievements = async () => {
    const { data } = await supabase.from("achievements").select("*").eq("user_id", userId)
    if (data) setAchievements(data)
  }

  const fetchFollows = async () => {
    const { data: frs } = await supabase.from("follows").select("*").eq("following_id", userId)
    const { data: fng } = await supabase.from("follows").select("*").eq("follower_id", userId)
    if (frs) { setFollowers(frs); setIsFollowing(frs.some(f => f.follower_id === session.user.id)) }
    if (fng) setFollowing(fng)
  }

  const saveProfile = async () => {
    setSaving(true)
    const { error } = await supabase.from("profiles").upsert({
      id: userId, username: form.username, full_name: form.full_name,
      bio: form.bio, location: form.location, website: form.website,
      avatar_emoji: form.avatar_emoji, avatar_color: form.avatar_color,
      avatar_url: form.avatar_url, cover_url: form.cover_url, is_private: form.is_private
    })
    if (!error) { setProfile(form); setEditing(false) }
    setSaving(false)
  }

  const uploadAvatar = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingAvatar(true)
    const path = `avatars/${userId}/${Date.now()}.${file.name.split(".").pop()}`
    const { error } = await supabase.storage.from("travel-media").upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("travel-media").getPublicUrl(path)
      setForm(prev => ({ ...prev, avatar_url: publicUrl }))
    }
    setUploadingAvatar(false)
  }

  const uploadCover = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingCover(true)
    const path = `covers/${userId}/${Date.now()}.${file.name.split(".").pop()}`
    const { error } = await supabase.storage.from("travel-media").upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("travel-media").getPublicUrl(path)
      setForm(prev => ({ ...prev, cover_url: publicUrl }))
    }
    setUploadingCover(false)
  }

  const toggleFollow = async () => {
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", session.user.id).eq("following_id", userId)
      setIsFollowing(false)
      setFollowers(prev => prev.filter(f => f.follower_id !== session.user.id))
    } else {
      await supabase.from("follows").insert([{ follower_id: session.user.id, following_id: userId }])
      setIsFollowing(true)
      setFollowers(prev => [...prev, { follower_id: session.user.id, following_id: userId }])
    }
  }

  const getTrip = (tripId) => trips.find(t => t.id === tripId)
  const photosByTrip = trips.map(trip => ({ trip, photos: photos.filter(p => p.trip_id === trip.id) })).filter(g => g.photos.length > 0)
  const stats = {
    trips: trips.length,
    countries: [...new Set(trips.filter(t => t.destination).map(t => t.destination?.split(",").pop()?.trim()))].length,
    days: trips.filter(t => t.start_date && t.end_date).reduce((acc, t) => acc + Math.ceil((new Date(t.end_date) - new Date(t.start_date)) / (1000*60*60*24)), 0),
    photos: photos.length
  }

  const isPrivateAndNotFollowing = profile?.is_private && !isOwnProfile && !isFollowing
  const displayProfile = editing ? form : profile

  if (loading) return <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100vh"}}><div style={{color:"var(--text-soft)"}}>Wird geladen...</div></div>

  return (
    <div style={{maxWidth:680, margin:"0 auto", paddingBottom:60}}>

      {/* Lightbox */}
      {selectedPhoto && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:1000}} onClick={() => setSelectedPhoto(null)}>
          <div style={{position:"relative"}} onClick={e => e.stopPropagation()}>
            <img src={selectedPhoto.url} style={{maxWidth:"90vw", maxHeight:"65vh", objectFit:"contain", borderRadius:16}} />
            <button onClick={() => setSelectedPhoto(null)} style={{position:"absolute", top:-16, right:-16, background:"rgba(255,255,255,0.15)", border:"none", borderRadius:"50%", width:36, height:36, color:"white", cursor:"pointer", fontSize:18}}>✕</button>
          </div>
          {getTrip(selectedPhoto.trip_id) && (
            <div style={{marginTop:16, display:"flex", alignItems:"center", gap:12, padding:"14px 20px", background:"rgba(255,255,255,0.08)", borderRadius:16, border:"1px solid rgba(255,255,255,0.12)"}} onClick={e => e.stopPropagation()}>
              <div style={{fontSize:28}}>{getTrip(selectedPhoto.trip_id).emoji}</div>
              <div>
                <div style={{color:"white", fontWeight:600, fontSize:15}}>{getTrip(selectedPhoto.trip_id).title}</div>
                {getTrip(selectedPhoto.trip_id).destination && <div style={{color:"var(--text-soft)", fontSize:13}}>📍 {getTrip(selectedPhoto.trip_id).destination}</div>}
                <div style={{color:"var(--text-soft)", fontSize:12}}>{new Date(selectedPhoto.created_at).toLocaleDateString("de-DE", {day:"2-digit", month:"long", year:"numeric"})}</div>
              </div>
              {onSelectTrip && (
                <button onClick={() => { onSelectTrip(getTrip(selectedPhoto.trip_id)); setSelectedPhoto(null) }}
                  style={{padding:"10px 18px", background:"linear-gradient(135deg, var(--teal), var(--green))", border:"none", borderRadius:12, color:"white", cursor:"pointer", fontSize:14, fontWeight:600, whiteSpace:"nowrap"}}>
                  Zur Reise →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cover */}
      <div style={{position:"relative", height:200, background: displayProfile?.cover_url ? "transparent" : "linear-gradient(135deg, rgba(8,145,178,0.4), rgba(5,150,105,0.4))", overflow:"hidden"}}>
        {displayProfile?.cover_url && <img src={displayProfile.cover_url} style={{width:"100%", height:"100%", objectFit:"cover"}} />}
        {editing && (
          <>
            <input ref={coverInputRef} type="file" accept="image/*" onChange={uploadCover} style={{display:"none"}} />
            <button onClick={() => coverInputRef.current.click()} style={{position:"absolute", bottom:12, right:12, background:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, padding:"8px 14px", color:"white", cursor:"pointer", fontSize:13, backdropFilter:"blur(10px)"}}>
              {uploadingCover ? "⏳" : "📷 Cover ändern"}
            </button>
          </>
        )}
      </div>

      <div style={{padding:"0 24px", marginTop:-55}}>
        {/* Avatar + Buttons */}
        <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:16}}>
          <div style={{position:"relative"}}>
            <div style={{width:110, height:110, borderRadius:"50%", border:"4px solid var(--bg)", background: displayProfile?.avatar_url ? "transparent" : (displayProfile?.avatar_color || "#0891b2"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:52, overflow:"hidden", cursor: editing ? "pointer" : "default"}}
              onClick={() => editing && avatarInputRef.current.click()}>
              {displayProfile?.avatar_url ? <img src={displayProfile.avatar_url} style={{width:"100%", height:"100%", objectFit:"cover"}} /> : (displayProfile?.avatar_emoji || "👤")}
            </div>
            {editing && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={uploadAvatar} style={{display:"none"}} />
                <div style={{position:"absolute", bottom:4, right:4, width:30, height:30, borderRadius:"50%", background:"var(--teal)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:14}} onClick={() => avatarInputRef.current.click()}>
                  {uploadingAvatar ? "⏳" : "📷"}
                </div>
              </>
            )}
          </div>
          <div style={{display:"flex", gap:8, paddingBottom:8}}>
            {isOwnProfile ? (
              editing ? (
                <div style={{display:"flex", gap:8}}>
                  <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving ? "..." : "Speichern ✅"}</button>
                  <button className="btn-secondary" onClick={() => { setEditing(false); setForm(profile) }}>Abbrechen</button>
                </div>
              ) : (
                <button className="btn-secondary" onClick={() => setEditing(true)}>✏️ Bearbeiten</button>
              )
            ) : (
              <button onClick={toggleFollow} style={{padding:"10px 24px", borderRadius:12, border:"none", cursor:"pointer", fontWeight:600, fontSize:14, background: isFollowing ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, var(--teal), var(--green))", color:"white"}}>
                {isFollowing ? "✓ Gefolgt" : "+ Folgen"}
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        {editing ? (
          <div style={{marginBottom:20}}>
            <input placeholder="Vollständiger Name" value={form.full_name || ""} onChange={e => setForm({...form, full_name: e.target.value})} style={{width:"100%", padding:"10px 14px", borderRadius:10, marginBottom:8, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:15, outline:"none"}} />
            <input placeholder="@username" value={form.username || ""} onChange={e => setForm({...form, username: e.target.value})} style={{width:"100%", padding:"10px 14px", borderRadius:10, marginBottom:8, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"var(--teal-light)", fontSize:14, outline:"none"}} />
            <textarea placeholder="Bio..." value={form.bio || ""} onChange={e => setForm({...form, bio: e.target.value})} rows={3} style={{width:"100%", padding:"10px 14px", borderRadius:10, marginBottom:8, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:14, outline:"none", resize:"vertical"}} />
            <div style={{display:"flex", gap:8, marginBottom:8}}>
              <input placeholder="📍 Wohnort" value={form.location || ""} onChange={e => setForm({...form, location: e.target.value})} style={{flex:1, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:14, outline:"none"}} />
              <input placeholder="🔗 Website" value={form.website || ""} onChange={e => setForm({...form, website: e.target.value})} style={{flex:1, padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", color:"white", fontSize:14, outline:"none"}} />
            </div>
            <div style={{display:"flex", gap:8, marginBottom:8}}>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{padding:"8px 14px", background:"rgba(255,255,255,0.05)", border:"1px solid var(--border)", borderRadius:10, color:"white", cursor:"pointer", fontSize:13}}>{form.avatar_emoji} Emoji</button>
              <button onClick={() => setShowColorPicker(!showColorPicker)} style={{padding:"8px 14px", background: form.avatar_color, border:"none", borderRadius:10, color:"white", cursor:"pointer", fontSize:13}}>🎨 Farbe</button>
            </div>
            {showEmojiPicker && <div style={{display:"flex", flexWrap:"wrap", gap:6, padding:10, background:"rgba(0,0,0,0.3)", border:"1px solid var(--border)", borderRadius:12, marginBottom:8}}>{AVATAR_EMOJIS.map(emoji => <button key={emoji} onClick={() => { setForm({...form, avatar_emoji: emoji}); setShowEmojiPicker(false) }} style={{fontSize:24, background:"transparent", border:"none", cursor:"pointer", padding:4}}>{emoji}</button>)}</div>}
            {showColorPicker && <div style={{display:"flex", gap:8, flexWrap:"wrap", padding:10, background:"rgba(0,0,0,0.3)", border:"1px solid var(--border)", borderRadius:12, marginBottom:8}}>{AVATAR_COLORS.map(color => <button key={color} onClick={() => { setForm({...form, avatar_color: color}); setShowColorPicker(false) }} style={{width:32, height:32, borderRadius:"50%", background:color, border: form.avatar_color === color ? "3px solid white" : "2px solid transparent", cursor:"pointer"}} />)}</div>}
            <div style={{display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"rgba(255,255,255,0.04)", borderRadius:10}}>
              <input type="checkbox" id="isPrivate" checked={form.is_private || false} onChange={e => setForm({...form, is_private: e.target.checked})} style={{width:18, height:18, cursor:"pointer", accentColor:"var(--teal)"}} />
              <label htmlFor="isPrivate" style={{color:"var(--text-soft)", fontSize:14, cursor:"pointer"}}>🔒 Privates Profil</label>
            </div>
          </div>
        ) : (
          <div style={{marginBottom:16}}>
            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:4}}>
              <h2 style={{color:"white", margin:0, fontSize:22}}>{profile?.full_name || profile?.username || "Kein Name"}</h2>
              {profile?.is_private && <span style={{fontSize:12, padding:"2px 8px", background:"rgba(255,255,255,0.1)", borderRadius:20, color:"var(--text-soft)"}}>🔒 Privat</span>}
            </div>
            <div style={{color:"var(--teal-light)", fontSize:14, marginBottom:8}}>@{profile?.username}</div>
            {profile?.bio && <p style={{color:"var(--text-soft)", fontSize:14, margin:"0 0 8px 0", lineHeight:1.6}}>{profile.bio}</p>}
            <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
              {profile?.location && <span style={{color:"var(--text-soft)", fontSize:13}}>📍 {profile.location}</span>}
              {profile?.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{color:"var(--teal-light)", fontSize:13, textDecoration:"none"}}>🔗 {profile.website}</a>}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{display:"flex", marginBottom:20, paddingBottom:20, borderBottom:"1px solid var(--border)", overflowX:"auto"}}>
          {[{val:followers.length,label:"Follower"},{val:following.length,label:"Folge ich"},{val:stats.trips,label:"✈️ Reisen"},{val:stats.countries,label:"🌍 Länder"},{val:stats.days,label:"📅 Tage"},{val:stats.photos,label:"📸 Fotos"}].map((s,i) => (
            <div key={i} style={{textAlign:"center", flex:1, minWidth:60}}>
              <div style={{color:"white", fontWeight:700, fontSize:20}}>{s.val}</div>
              <div style={{color:"var(--text-soft)", fontSize:11, whiteSpace:"nowrap"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {isPrivateAndNotFollowing ? (
          <div style={{textAlign:"center", padding:"60px 20px"}}>
            <div style={{fontSize:48, marginBottom:16}}>🔒</div>
            <h3 style={{color:"white", marginBottom:8}}>Dieses Profil ist privat</h3>
            <p style={{color:"var(--text-soft)"}}>Folge diesem Account um seine Beiträge zu sehen</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{display:"flex", gap:4, marginBottom:20}}>
              {[{id:"photos",label:"📸 Fotos"},{id:"trips",label:"✈️ Reisen"},{id:"achievements",label:"🏆 Erfolge"}].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{padding:"8px 20px", borderRadius:10, border:"none", cursor:"pointer", background: activeTab === tab.id ? "linear-gradient(135deg, var(--teal), var(--green))" : "rgba(255,255,255,0.05)", color: activeTab === tab.id ? "white" : "var(--text-soft)", fontWeight: activeTab === tab.id ? 600 : 400, fontSize:14}}>{tab.label}</button>
              ))}
            </div>

            {/* FOTOS */}
            {activeTab === "photos" && (
              <div>
                <div style={{display:"flex", gap:8, marginBottom:16}}>
                  <button onClick={() => setPhotoView("folders")} style={{padding:"6px 16px", borderRadius:8, border:"none", cursor:"pointer", background: photoView === "folders" ? "var(--teal)" : "rgba(255,255,255,0.05)", color:"white", fontSize:13}}>📁 Ordner</button>
                  <button onClick={() => setPhotoView("timeline")} style={{padding:"6px 16px", borderRadius:8, border:"none", cursor:"pointer", background: photoView === "timeline" ? "var(--teal)" : "rgba(255,255,255,0.05)", color:"white", fontSize:13}}>📅 Timeline</button>
                </div>

                {photos.length === 0 ? (
                  <div className="empty"><div className="empty-icon">📸</div><h3>Noch keine Fotos</h3></div>
                ) : photoView === "folders" ? (
                  photosByTrip.length === 0
                    ? <div className="empty"><div className="empty-icon">📁</div><h3>Keine Ordner</h3></div>
                    : photosByTrip.map(({ trip, photos: tripPhotos }) => (
                      <div key={trip.id} style={{marginBottom:8}}>
                        {/* Ordner Header */}
                        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", background:"var(--card)", border:"1px solid var(--border)", borderRadius: expandedFolder === trip.id ? "16px 16px 0 0" : 16, cursor:"pointer", transition:"all 0.2s"}}
                          onClick={() => setExpandedFolder(expandedFolder === trip.id ? null : trip.id)}>
                          <div style={{display:"flex", alignItems:"center", gap:12}}>
                            {/* Cover Preview */}
                            {tripPhotos[0] && (
                              <div style={{width:48, height:48, borderRadius:10, overflow:"hidden", flexShrink:0}}>
                                <img src={tripPhotos[0].url} style={{width:"100%", height:"100%", objectFit:"cover"}} />
                              </div>
                            )}
                            <div>
                              <div style={{color:"white", fontWeight:600, fontSize:15}}>{trip.emoji} {trip.title}</div>
                              <div style={{color:"var(--text-soft)", fontSize:12}}>
                                {trip.destination && `📍 ${trip.destination} · `}{tripPhotos.length} Fotos
                              </div>
                            </div>
                          </div>
                          <div style={{display:"flex", alignItems:"center", gap:8}}>
                            {onSelectTrip && (
                              <button onClick={e => { e.stopPropagation(); onSelectTrip(trip) }} style={{padding:"6px 14px", background:"rgba(8,145,178,0.15)", border:"1px solid rgba(8,145,178,0.3)", borderRadius:8, color:"var(--teal-light)", cursor:"pointer", fontSize:12, fontWeight:600}}>
                                Zur Reise →
                              </button>
                            )}
                            <span style={{color:"var(--text-soft)", fontSize:18}}>{expandedFolder === trip.id ? "▲" : "▼"}</span>
                          </div>
                        </div>
                        {/* Foto Grid aufgeklappt */}
                        {expandedFolder === trip.id && (
                          <div style={{border:"1px solid var(--border)", borderTop:"none", borderRadius:"0 0 16px 16px", overflow:"hidden", padding:8, background:"rgba(255,255,255,0.02)"}}>
                            <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:4}}>
                              {tripPhotos.filter(p => !p.is_video).map(photo => (
                                <div key={photo.id} style={{aspectRatio:"1", overflow:"hidden", borderRadius:8, cursor:"pointer"}}
                                  onClick={() => setSelectedPhoto(photo)}
                                  onMouseEnter={e => e.currentTarget.querySelector("img").style.transform = "scale(1.05)"}
                                  onMouseLeave={e => e.currentTarget.querySelector("img").style.transform = "scale(1)"}>
                                  <img src={photo.url} style={{width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.2s"}} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  /* Timeline */
                  <div>
                    {photos.filter(p => !p.is_video).reduce((acc, photo) => {
                      const day = new Date(photo.created_at).toLocaleDateString("de-DE", {day:"2-digit", month:"long", year:"numeric"})
                      if (!acc.find(g => g.day === day)) acc.push({ day, photos: [] })
                      acc.find(g => g.day === day).photos.push(photo)
                      return acc
                    }, []).map(group => (
                      <div key={group.day} style={{marginBottom:20}}>
                        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
                          <div style={{color:"var(--text-soft)", fontSize:13, fontWeight:600}}>📅 {group.day}</div>
                          {(() => { const t = getTrip(group.photos[0]?.trip_id); return t ? <span style={{fontSize:12, padding:"2px 10px", background:"rgba(8,145,178,0.1)", border:"1px solid rgba(8,145,178,0.2)", borderRadius:20, color:"var(--teal-light)", cursor:"pointer"}} onClick={() => onSelectTrip && onSelectTrip(t)}>{t.emoji} {t.title} →</span> : null })()}
                        </div>
                        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:3}}>
                          {group.photos.map(photo => (
                            <div key={photo.id} style={{aspectRatio:"1", overflow:"hidden", borderRadius:8, cursor:"pointer"}}
                              onClick={() => setSelectedPhoto(photo)}
                              onMouseEnter={e => e.currentTarget.querySelector("img").style.transform = "scale(1.05)"}
                              onMouseLeave={e => e.currentTarget.querySelector("img").style.transform = "scale(1)"}>
                              <img src={photo.url} style={{width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.2s"}} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REISEN */}
            {activeTab === "trips" && (
              trips.length === 0
                ? <div className="empty"><div className="empty-icon">✈️</div><h3>Noch keine Reisen</h3></div>
                : trips.map(trip => (
                  <div key={trip.id} style={{background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, padding:"16px 20px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", transition:"border-color 0.2s"}}
                    onClick={() => onSelectTrip && onSelectTrip(trip)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--teal)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <div>
                      <div style={{color:"white", fontWeight:600, fontSize:15}}>{trip.emoji} {trip.title}</div>
                      {trip.destination && <div style={{color:"var(--text-soft)", fontSize:13}}>📍 {trip.destination}</div>}
                      {trip.start_date && <div style={{color:"var(--text-soft)", fontSize:12}}>📅 {new Date(trip.start_date).toLocaleDateString("de-DE", {day:"2-digit", month:"short", year:"numeric"})}{trip.end_date ? ` → ${new Date(trip.end_date).toLocaleDateString("de-DE", {day:"2-digit", month:"short", year:"numeric"})}` : " → 🔄 Offen"}</div>}
                      <div style={{color:"var(--text-soft)", fontSize:12, marginTop:4}}>📸 {photos.filter(p => p.trip_id === trip.id).length} Fotos</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:36}}>{trip.emoji}</div>
                      <div style={{color:"var(--teal-light)", fontSize:12, marginTop:4}}>Öffnen →</div>
                    </div>
                  </div>
                ))
            )}

            {/* ACHIEVEMENTS */}
            {activeTab === "achievements" && (
              <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:12}}>
                {ACHIEVEMENTS.map(ach => {
                  const unlocked = achievements.some(a => a.type === ach.type)
                  return (
                    <div key={ach.type} style={{background: unlocked ? "linear-gradient(135deg, rgba(8,145,178,0.15), rgba(5,150,105,0.15))" : "rgba(255,255,255,0.03)", border: unlocked ? "1px solid rgba(8,145,178,0.3)" : "1px solid var(--border)", borderRadius:16, padding:"16px 20px", display:"flex", alignItems:"center", gap:12, opacity: unlocked ? 1 : 0.4}}>
                      <div style={{fontSize:36, filter: unlocked ? "none" : "grayscale(1)"}}>{ach.emoji}</div>
                      <div>
                        <div style={{color: unlocked ? "white" : "var(--text-soft)", fontWeight:600, fontSize:14}}>{ach.title}</div>
                        <div style={{color:"var(--text-soft)", fontSize:12}}>{ach.desc}</div>
                        {unlocked && <div style={{color:"var(--teal-light)", fontSize:11, marginTop:2}}>✓ Erreicht</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
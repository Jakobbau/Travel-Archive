import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet"
import MarkerClusterGroup from "react-leaflet-cluster"
import { supabase } from "../lib/supabase"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

const createEmojiIcon = (emoji) => L.divIcon({
  html: `<div style="background:linear-gradient(135deg,#0891b2,#059669);border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.5)"><span style="transform:rotate(45deg);font-size:20px">${emoji||"✈️"}</span></div>`,
  className: "",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
})

const calcDistance = (coords) => {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    const R = 6371
    const dLat = (coords[i][0] - coords[i-1][0]) * Math.PI / 180
    const dLon = (coords[i][1] - coords[i-1][1]) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(coords[i-1][0]*Math.PI/180) * Math.cos(coords[i][0]*Math.PI/180) * Math.sin(dLon/2)**2
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }
  return Math.round(total)
}

export default function WorldMap({ session, onSelectTrip }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRoute, setShowRoute] = useState(true)
  const [mapStyle, setMapStyle] = useState("hybrid")

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: memberTrips } = await supabase.from("trip_members").select("trip_id").eq("user_id", session.user.id)
    const tripIds = memberTrips ? memberTrips.map(m => m.trip_id) : []
    const { data: tripsData } = await supabase.from("trips").select("*").in("id", tripIds.length ? tripIds : ["none"]).order("start_date", { ascending: true })
    const geocoded = await geocodeTrips(tripsData || [])
    setTrips(geocoded)
    setLoading(false)
  }

  const geocodeTrips = async (trips) => {
    const result = []
    for (const trip of trips) {
      if (!trip.destination) { result.push(trip); continue }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trip.destination)}&limit=1`)
        const data = await res.json()
        if (data[0]) result.push({ ...trip, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
        else result.push(trip)
      } catch { result.push(trip) }
    }
    return result
  }

  const tripsWithCoords = trips.filter(t => t.lat && t.lng)
  const routeCoords = tripsWithCoords.map(t => [t.lat, t.lng])
  const totalDays = trips.filter(t => t.start_date && t.end_date).reduce((acc, t) => acc + Math.ceil((new Date(t.end_date) - new Date(t.start_date)) / (1000*60*60*24)), 0)
  const countries = [...new Set(trips.filter(t => t.destination).map(t => t.destination?.split(",").pop()?.trim()))].length
  const totalKm = routeCoords.length > 1 ? calcDistance(routeCoords) : 0

  const tileLayers = {
    hybrid: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      labels: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
      name: "🛰️ Satellit"
    },
    street: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      name: "🗺️ Karte"
    },
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      name: "🌑 Dark"
    }
  }

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:16}}>
      <div style={{fontSize:64, animation:"pulse 1.5s infinite"}}>🌍</div>
      <div style={{color:"var(--text-soft)"}}>Karte wird geladen...</div>
      <div style={{color:"var(--text-soft)", fontSize:12}}>Reiseziele werden gesucht...</div>
    </div>
  )

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh"}}>
      {/* Header */}
      <div style={{padding:"14px 24px",borderBottom:"1px solid var(--border)",background:"rgba(10,22,40,0.95)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h2 style={{color:"white",margin:"0 0 2px 0",fontSize:20}}>🌍 Weltkarte</h2>
          <p style={{color:"var(--text-soft)",margin:0,fontSize:12}}>Deine Reisewelt auf einen Blick</p>
        </div>
        {/* Kartenstil Switcher */}
        <div style={{display:"flex",gap:6}}>
          {Object.entries(tileLayers).map(([key, val]) => (
            <button key={key} onClick={() => setMapStyle(key)} style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight: mapStyle===key ? 600 : 400,background: mapStyle===key ? "linear-gradient(135deg,var(--teal),var(--green))" : "rgba(255,255,255,0.08)",color:"white"}}>
              {val.name}
            </button>
          ))}
        </div>
      </div>

      {/* Statistiken */}
      <div style={{display:"flex",padding:"12px 0",borderBottom:"1px solid var(--border)",background:"rgba(10,22,40,0.7)"}}>
        {[
          {val: trips.length, label: "✈️ Reisen"},
          {val: countries, label: "🌍 Länder"},
          {val: totalDays, label: "📅 Tage"},
          {val: totalKm > 0 ? `${totalKm.toLocaleString("de-DE")} km` : "—", label: "📏 Gereist"},
        ].map((s,i) => (
          <div key={i} style={{flex:1,textAlign:"center",padding:"4px 0"}}>
            <div style={{color:"white",fontWeight:700,fontSize:18}}>{s.val}</div>
            <div style={{color:"var(--text-soft)",fontSize:11}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Route Toggle */}
      {tripsWithCoords.length > 1 && (
        <div style={{padding:"8px 24px",background:"rgba(10,22,40,0.5)",display:"flex",alignItems:"center",gap:10}}>
          <input type="checkbox" id="route" checked={showRoute} onChange={e => setShowRoute(e.target.checked)} style={{accentColor:"var(--teal)",width:16,height:16,cursor:"pointer"}} />
          <label htmlFor="route" style={{color:"var(--text-soft)",fontSize:13,cursor:"pointer"}}>Route zwischen Reisezielen anzeigen</label>
        </div>
      )}

      {/* Karte */}
      <div style={{flex:1,position:"relative"}}>
        {tripsWithCoords.length === 0 ? (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16}}>
            <div style={{fontSize:64}}>🗺️</div>
            <h3 style={{color:"white"}}>Noch keine Orte auf der Karte</h3>
            <p style={{color:"var(--text-soft)",textAlign:"center",maxWidth:300}}>Füge deinen Reisen ein Reiseziel hinzu damit es hier erscheint!</p>
          </div>
        ) : (
          <MapContainer center={[tripsWithCoords[0].lat, tripsWithCoords[0].lng]} zoom={4} style={{height:"100%",width:"100%"}}>
            <TileLayer url={tileLayers[mapStyle].url} attribution="&copy; Esri / CARTO" maxZoom={19} />
            {mapStyle === "hybrid" && <TileLayer url={tileLayers.hybrid.labels} attribution="" />}
            
            {showRoute && routeCoords.length > 1 && (
              <Polyline positions={routeCoords} color="#0891b2" weight={2} opacity={0.7} dashArray="8,8" />
            )}

            <MarkerClusterGroup chunkedLoading>
              {tripsWithCoords.map(trip => (
                <Marker key={trip.id} position={[trip.lat, trip.lng]} icon={createEmojiIcon(trip.emoji)}>
                  <Popup>
                    <div style={{minWidth:200,fontFamily:"sans-serif"}}>
                      <div style={{fontSize:28,marginBottom:6}}>{trip.emoji}</div>
                      <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{trip.title}</div>
                      {trip.destination && <div style={{color:"#555",fontSize:13,marginBottom:4}}>📍 {trip.destination}</div>}
                      {trip.start_date && (
                        <div style={{color:"#555",fontSize:12,marginBottom:10}}>
                          📅 {new Date(trip.start_date).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"})}
                          {trip.end_date ? ` → ${new Date(trip.end_date).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"})}` : " → Offen"}
                        </div>
                      )}
                      {onSelectTrip && (
                        <button onClick={() => onSelectTrip(trip)} style={{width:"100%",padding:"9px 12px",background:"linear-gradient(135deg,#0891b2,#059669)",border:"none",borderRadius:8,color:"white",cursor:"pointer",fontSize:13,fontWeight:600}}>
                          Zur Reise →
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </div>
    </div>
  )
}

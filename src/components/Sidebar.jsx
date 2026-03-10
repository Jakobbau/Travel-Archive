import { useState } from "react"
import { supabase } from "../lib/supabase"

const NAV_ITEMS = [
  { id: "dashboard", icon: "🏠", label: "Dashboard" },
  { id: "trips", icon: "✈️", label: "Meine Reisen" },
  { id: "profile", icon: "👤", label: "Mein Profil" },
  { id: "groups", icon: "👥", label: "Gruppen" },
  { id: "map", icon: "🗺️", label: "Weltkarte" },
]

export default function Sidebar({ currentPage, setCurrentPage, session }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: "none",
          position: "fixed", top: 16, left: 16, zIndex: 1000,
          background: "var(--bg2)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "8px 12px", cursor: "pointer",
          fontSize: 20, color: "white"
        }}
        className="mobile-menu-btn"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* Overlay für Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            display: "none", position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)", zIndex: 998
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <div style={{
        width: collapsed ? 70 : 240,
        minHeight: "100vh",
        background: "rgba(10,22,40,0.95)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        transition: "width 0.25s ease",
        position: "sticky", top: 0, height: "100vh",
        backdropFilter: "blur(20px)",
        flexShrink: 0, zIndex: 999
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? "20px 16px" : "24px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between"
        }}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            <img src="/logo.png" style={{height:36, width:36, borderRadius:8, flexShrink:0}} />
            {!collapsed && (
              <div>
                <div style={{color:"white", fontWeight:700, fontSize:15, lineHeight:1.2}}>Travel</div>
                <div style={{color:"var(--teal)", fontWeight:700, fontSize:15, lineHeight:1.2}}>Archive</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{
              background:"transparent", border:"none", color:"var(--text-soft)",
              cursor:"pointer", fontSize:18, padding:4
            }}>‹</button>
          )}
        </div>

        {/* Collapse Button wenn zugeklappt */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{
            background:"transparent", border:"none", color:"var(--text-soft)",
            cursor:"pointer", fontSize:18, padding:"8px", textAlign:"center"
          }}>›</button>
        )}

        {/* Navigation */}
        <nav style={{flex:1, padding:"16px 12px"}}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                width:"100%", display:"flex", alignItems:"center",
                gap: collapsed ? 0 : 12,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "12px 8px" : "12px 16px",
                borderRadius: 12, border:"none", cursor:"pointer",
                marginBottom: 4, transition:"all 0.2s",
                background: currentPage === item.id
                  ? "linear-gradient(135deg, rgba(8,145,178,0.25), rgba(5,150,105,0.25))"
                  : "transparent",
                color: currentPage === item.id ? "white" : "var(--text-soft)",
                borderLeft: currentPage === item.id
                  ? "3px solid var(--teal)" : "3px solid transparent",
              }}
            >
              <span style={{fontSize:20}}>{item.icon}</span>
              {!collapsed && (
                <span style={{fontSize:14, fontWeight: currentPage === item.id ? 600 : 400}}>
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User & Abmelden */}
        <div style={{padding:"16px 12px", borderTop:"1px solid var(--border)"}}>
          {!collapsed && (
            <div style={{
              padding:"12px 16px", borderRadius:12,
              background:"rgba(255,255,255,0.04)",
              marginBottom:8
            }}>
              <div style={{color:"white", fontSize:13, fontWeight:600, marginBottom:2}}>
                👤 Mein Account
              </div>
              <div style={{color:"var(--text-muted)", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                {session.user.email}
              </div>
            </div>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              width:"100%", display:"flex", alignItems:"center",
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "12px 8px" : "12px 16px",
              borderRadius:12, border:"none", cursor:"pointer",
              background:"transparent", color:"var(--text-soft)",
              fontSize:14, transition:"all 0.2s"
            }}
          >
            <span style={{fontSize:20}}>🚪</span>
            {!collapsed && <span>Abmelden</span>}
          </button>
        </div>
      </div>
    </>
  )
}

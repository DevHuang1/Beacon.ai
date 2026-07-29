import React, { useState, useEffect, useCallback } from "react";
import { PageHeader, Panel, Button } from "../components";
import {
  Settings, MapPin, Plus, Trash2, Save, UserPlus, Phone, User,
  LocateFixed, Target, CheckCircle2, AlertCircle, Users,
  Search, Globe, Share2, Bell, Copy, ExternalLink, Compass,
} from "lucide-react";
import { C, S, fontDisplay, fontMono } from "../lib/theme";
import { useLocation } from "../lib/LocationContext";
import { useAuth } from "../components/AuthProvider";

const STORAGE_KEYS = {
  family: "beacon_profile_family",
  prefs: "beacon_profile_prefs",
};

function loadJSON(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export default function Profile() {
  const loc = useLocation();
  const { user } = useAuth();

  const [family, setFamilyState] = useState(() => loadJSON(STORAGE_KEYS.family, []));
  const [prefs, setPrefsState] = useState(() => loadJSON(STORAGE_KEYS.prefs, { defaultRadius: 10 }));
  const [saved, setSaved] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", role: "", username: "" });

  const [cityQuery, setCityQuery] = useState("");
  const [cityResults, setCityResults] = useState([]);
  const [searchingCity, setSearchingCity] = useState(false);

  const [usernameQuery, setUsernameQuery] = useState("");
  const [usernameResults, setUsernameResults] = useState([]);
  const [searchingUser, setSearchingUser] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [alertMsg, setAlertMsg] = useState("");

  const [userMeta, setUserMeta] = useState(null);

  const [usernameEdit, setUsernameEdit] = useState("");
  const [displayNameEdit, setDisplayNameEdit] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState("");
  const [dbInitMsg, setDbInitMsg] = useState("");
  const [dbInitBusy, setDbInitBusy] = useState(false);
  const [dbInitResult, setDbInitResult] = useState(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUserMeta(d.user.user_metadata || {});
          setUsernameEdit(d.user.user_metadata?.username || "");
          setDisplayNameEdit(d.user.user_metadata?.display_name || d.user.email?.split("@")[0] || "");
        }
      })
      .catch(() => {});
  }, []);

  const setFamily = useCallback((v) => { setFamilyState(v); setSaved(false); }, []);

  const handleSave = () => {
    saveJSON(STORAGE_KEYS.family, family);
    saveJSON(STORAGE_KEYS.prefs, prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const searchCity = useCallback(async (query) => {
    if (!query || query.trim().length < 2) { setCityResults([]); return; }
    setSearchingCity(true);
    try {
      const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=en`;
      const res = await fetch(url, { headers: { "User-Agent": "BeaconAI-EmergencyApp/1.0" } });
      const data = await res.json();
      setCityResults((data || []).map((r) => ({
        label: r.display_name,
        lat: parseFloat(r.lat).toFixed(6),
        lon: parseFloat(r.lon).toFixed(6),
      })));
    } catch {
      setCityResults([]);
    }
    setSearchingCity(false);
  }, []);

  const selectCityResult = (r) => {
    loc.updateLocation(parseFloat(r.lat), parseFloat(r.lon), r.label);
    setCityQuery(r.label.split(",")[0]);
    setCityResults([]);
  };

  const searchUsername = useCallback(async (query) => {
    if (!query || query.trim().length < 1) { setUsernameResults([]); return; }
    setSearchingUser(true);
    try {
      const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setUsernameResults(data?.data?.users || []);
    } catch {
      setUsernameResults([]);
    }
    setSearchingUser(false);
  }, []);

  const handleInitDb = async () => {
    setDbInitBusy(true);
    setDbInitResult(null);
    setDbInitMsg("Setting up database tables...");
    try {
      const res = await fetch("/api/profiles/init", { method: "POST" });
      const data = await res.json();
      setDbInitResult(data);
      setDbInitMsg(data.success ? "Database ready!" : data.note || "See output below");
    } catch (err) {
      setDbInitResult({ success: false, error: err.message });
      setDbInitMsg("Setup failed");
    }
    setDbInitBusy(false);
  };

  const selectUserResult = (u) => {
    setForm({
      name: u.display_name || u.username || u.email?.split("@")[0] || "",
      username: u.username || u.email || "",
      phone: "",
      role: "Family",
    });
    setUsernameQuery(u.username || u.email || "");
    setUsernameResults([]);
  };

  const handleAddMember = () => {
    if (!form.name.trim()) return;
    setFamily([...family, { id: generateId(), name: form.name.trim(), phone: form.phone.trim(), role: form.role.trim() || "Family", username: form.username.trim() || null }]);
    resetForm();
  };

  const handleUpdateMember = (id) => {
    if (!form.name.trim()) return;
    setFamily(family.map((m) => (m.id === id ? { ...m, name: form.name.trim(), phone: form.phone.trim(), role: form.role.trim() || "Family", username: form.username.trim() || m.username } : m)));
    resetForm();
  };

  const handleDeleteMember = (id) => {
    setFamily(family.filter((m) => m.id !== id));
    if (editId === id) resetForm();
  };

  const startEdit = (m) => {
    setEditId(m.id);
    setForm({ name: m.name, phone: m.phone || "", role: m.role || "", username: m.username || "" });
    setShowAddForm(false);
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", role: "", username: "" });
    setEditId(null);
    setShowAddForm(false);
    setUsernameQuery("");
    setUsernameResults([]);
  };

  const handleSaveUsername = async () => {
    if (!usernameEdit.trim() || usernameEdit.trim().length < 2) {
      setUsernameMsg("Username must be at least 2 characters");
      return;
    }
    setUsernameSaving(true);
    setUsernameMsg("");
    try {
      const res = await fetch("/api/profiles/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameEdit.trim(), display_name: displayNameEdit.trim() || usernameEdit.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setUsernameMsg("Username saved!");
        setUserMeta((m) => ({ ...m, username: data.data.username, display_name: data.data.display_name }));
      } else {
        setUsernameMsg(data.error || "Failed to save username");
      }
    } catch {
      setUsernameMsg("Error saving username");
    }
    setUsernameSaving(false);
    setTimeout(() => setUsernameMsg(""), 3000);
  };

  const shareLocation = async (member) => {
    if (typeof window === "undefined") return;
    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lon}`;
    const msg = `🚨 BEACON.AI EMERGENCY\nMy location: ${mapsUrl}\nStay safe!`;
    try {
      if (navigator.share) { await navigator.share({ title: "My Emergency Location", text: msg }); }
      else { await navigator.clipboard.writeText(msg); }
      setShareMsg(`Location shared with ${member.name}`);
    } catch { setShareMsg(`Could not share`); }
    setTimeout(() => setShareMsg(""), 4000);
  };

  const alertMember = async (member) => {
    const mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lon}`;
    const msg = `🚨 EMERGENCY ALERT from ${user?.email || "family member"} on Beacon.AI\nLocation: ${mapsUrl}`;
    if (Notification.permission === "granted") {
      new Notification("Emergency Alert Sent", { body: `Alerting ${member.name}...` });
    } else if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      if (perm === "granted") new Notification("Emergency Alert Sent", { body: `Alerting ${member.name}...` });
    }
    try { await navigator.clipboard.writeText(msg); setAlertMsg(`Alert prepared for ${member.name}`); }
    catch { setAlertMsg(`Alert ready for ${member.name}`); }
    setTimeout(() => setAlertMsg(""), 5000);
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <PageHeader icon={Settings} title="Profile & Settings" subtitle="Manage your profile, location, family members, and emergency sharing" tone="info" />

      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>

        {/* My Account */}
        <Panel title="My Account">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 14, color: C.textDim, fontFamily: fontMono }}>{user?.email}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: "block", fontSize: 11, color: C.textFaint, fontFamily: fontMono, marginBottom: 4 }}>USERNAME</label>
                <input value={usernameEdit} onChange={(e) => setUsernameEdit(e.target.value)}
                  placeholder="Choose a unique username"
                  style={{ width: "100%", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: fontMono }} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: "block", fontSize: 11, color: C.textFaint, fontFamily: fontMono, marginBottom: 4 }}>DISPLAY NAME</label>
                <input value={displayNameEdit} onChange={(e) => setDisplayNameEdit(e.target.value)}
                  placeholder="Your display name"
                  style={{ width: "100%", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }} />
              </div>
              <Button variant="primary" onClick={handleSaveUsername} disabled={usernameSaving}
                style={{ padding: "9px 16px", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <Save size={14} /> {usernameSaving ? "Saving..." : "Save"}
              </Button>
            </div>
            {usernameMsg && (
              <div style={{ fontSize: 12, color: usernameMsg.includes("saved") ? C.teal : C.red, display: "flex", alignItems: "center", gap: 5 }}>
                {usernameMsg.includes("saved") ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {usernameMsg}
              </div>
            )}
          </div>
        </Panel>

        {/* My Default Location */}
        <Panel title="My Location">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Current location status */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: loc.gpsStatus === "live" ? C.tealDim : C.panel2, borderRadius: 8, border: `1px solid ${loc.gpsStatus === "live" ? C.teal + "44" : C.line}` }}>
              <Compass size={18} color={loc.gpsStatus === "live" ? C.teal : C.textFaint} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: fontMono }}>{loc.coords}</div>
                <div style={{ fontSize: 11, color: C.textFaint, marginTop: 1 }}>
                  {loc.gpsStatus === "live" ? "Live GPS" : loc.gpsStatus === "saved" ? "Saved location" : "Default location"}
                  {loc.accuracy ? ` (${Math.round(loc.accuracy)}m accuracy)` : ""}
                </div>
              </div>
              <Button variant="secondary" onClick={loc.refreshGps} style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                <LocateFixed size={13} /> Refresh
              </Button>
            </div>

            {/* Search by city/country */}
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.textDim, fontFamily: fontMono, marginBottom: 4 }}>
                Search by city, town, or address
              </label>
              <div style={{ position: "relative" }}>
                <Globe size={15} color={C.textFaint} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                <input value={cityQuery} onChange={(e) => { setCityQuery(e.target.value); searchCity(e.target.value); }}
                  placeholder="e.g. Yangon, Myanmar"
                  style={{ width: "100%", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px 10px 36px", color: C.text, fontSize: 14 }} />
                {searchingCity && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.textFaint }}>Searching...</span>}
              </div>
              {cityResults.length > 0 && (
                <div style={{ marginTop: 6, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                  {cityResults.map((r, i) => (
                    <div key={i} onClick={() => selectCityResult(r)}
                      style={{ padding: "10px 12px", cursor: "pointer", fontSize: 13, color: C.text, background: C.panel, borderBottom: i < cityResults.length - 1 ? `1px solid ${C.lineSoft}` : "none", display: "flex", alignItems: "center", gap: 8 }}>
                      <MapPin size={13} color={C.teal} />
                      <span style={{ flex: 1 }}>{r.label}</span>
                      <span style={{ fontSize: 11, fontFamily: fontMono, color: C.textFaint }}>{r.lat}, {r.lon}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* Family Members */}
        <Panel
          title="Family Members"
          action={
            <Button variant="secondary" onClick={() => { setShowAddForm(!showAddForm); setEditId(null); setForm({ name: "", phone: "", role: "", username: "" }); setUsernameResults([]); }}
              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }} ariaLabel="Add family member">
              <UserPlus size={14} /> Add
            </Button>
          }
        >
          {family.length === 0 && !showAddForm && (
            <div style={{ fontSize: 13, color: C.textFaint, textAlign: "center", padding: 20 }}>
              No family members added yet. Tap "Add" to add someone by name or search by username.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(showAddForm || editId) && (
              <div style={{ background: C.panel2, border: `1px solid ${C.blue}66`, borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *"
                    style={{ flex: 2, minWidth: 140, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }} />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone"
                    style={{ flex: 2, minWidth: 140, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }} />
                  <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role"
                    style={{ flex: 1, minWidth: 120, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13 }} />
                </div>

                <div style={{ borderTop: `1px solid ${C.lineSoft}`, paddingTop: 10 }}>
                  <label style={{ display: "block", fontSize: 11, color: C.textFaint, fontFamily: fontMono, marginBottom: 4 }}>Or find by username</label>
                  <div style={{ position: "relative" }}>
                    <Search size={14} color={C.textFaint} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={usernameQuery} onChange={(e) => { setUsernameQuery(e.target.value); searchUsername(e.target.value); }}
                      placeholder="Search username..."
                      style={{ width: "100%", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px 8px 32px", color: C.text, fontSize: 13 }} />
                  </div>
                  {searchingUser && <span style={{ fontSize: 11, color: C.textFaint, marginTop: 4, display: "block" }}>Searching users...</span>}
                  {usernameResults.length > 0 && (
                    <div style={{ marginTop: 4, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                      {usernameResults.map((u, i) => (
                        <div key={u.id} onClick={() => selectUserResult(u)}
                          style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, background: C.panel, borderBottom: i < usernameResults.length - 1 ? `1px solid ${C.lineSoft}` : "none", display: "flex", alignItems: "center", gap: 8 }}>
                          <User size={13} color={C.blue} />
                          <span style={{ fontWeight: 600, flex: 1 }}>{u.display_name}</span>
                          <span style={{ fontSize: 11, color: C.textFaint, fontFamily: fontMono }}>@{u.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {usernameQuery && !searchingUser && usernameResults.length === 0 && (
                    <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>No users found. They need to sign up with a username first.</div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Button variant="ghost" onClick={resetForm} style={{ padding: "6px 12px", fontSize: 12 }}>Cancel</Button>
                  <Button variant="primary" onClick={() => editId ? handleUpdateMember(editId) : handleAddMember()}
                    disabled={!form.name.trim()} style={{ padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                    <Save size={13} /> {editId ? "Update" : "Save"}
                  </Button>
                </div>
              </div>
            )}

            {family.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueGlow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={16} color={C.blue} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                      {m.name}
                      {m.username && <span style={{ fontSize: 11, color: C.textFaint, fontFamily: fontMono }}>@{m.username}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.textFaint, fontFamily: fontMono, marginTop: 1 }}>{m.role}{m.phone ? ` · ${m.phone}` : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => shareLocation(m)} style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.panel, cursor: "pointer", color: C.teal, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                    <Share2 size={12} /> Share
                  </button>
                  <button onClick={() => alertMember(m)} style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.red}44`, background: C.redDim, cursor: "pointer", color: C.red, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                    <Bell size={12} /> Alert
                  </button>
                  <button onClick={() => startEdit(m)} style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.panel, cursor: "pointer", color: C.textDim, fontSize: 12 }}>Edit</button>
                  <button onClick={() => handleDeleteMember(m.id)} style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.red}44`, background: C.redDim, cursor: "pointer", color: C.red, fontSize: 12 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {shareMsg && <div style={{ marginTop: 10, fontSize: 12, color: C.teal, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: C.tealDim, borderRadius: 8 }}><CheckCircle2 size={13} /> {shareMsg}</div>}
          {alertMsg && <div style={{ marginTop: 10, fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: C.redDim, borderRadius: 8 }}><Bell size={13} /> {alertMsg}</div>}
        </Panel>

        {/* Database */}
        <Panel title="Database">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, color: C.textDim }}>
              Your username is stored in your Supabase account. For full database support (profiles table, family relationships, shared locations), run the setup below.
            </div>
            <Button variant="primary" onClick={handleInitDb} disabled={dbInitBusy}
              style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 6, fontSize: 13, alignSelf: "flex-start" }}>
              <Save size={14} /> {dbInitBusy ? "Setting up..." : "Initialize Database Tables"}
            </Button>
            {dbInitMsg && (
              <div style={{
                fontSize: 12, padding: "10px 14px", borderRadius: 8,
                background: dbInitResult?.success ? C.tealDim : C.redDim,
                color: dbInitResult?.success ? C.teal : C.red,
                border: `1px solid ${dbInitResult?.success ? C.teal + "44" : C.red + "44"}`,
              }}>
                {dbInitMsg}
                {dbInitResult?.sqlScript && (
                  <div style={{ marginTop: 8, fontSize: 11, color: C.textFaint }}>
                    To set up manually, run <code style={{ background: C.panel, padding: "2px 6px", borderRadius: 4 }}>{dbInitResult.sqlScript}</code> in Supabase SQL Editor.
                  </div>
                )}
                {dbInitResult?.error && (
                  <div style={{ marginTop: 8, fontSize: 11, color: C.textFaint }}>{dbInitResult.error}</div>
                )}
              </div>
            )}
          </div>
        </Panel>

        {/* Preferences */}
        <Panel title="Preferences">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.textDim, fontFamily: fontMono, marginBottom: 4 }}>Default Shelter Search Radius</label>
              <select value={prefs.defaultRadius} onChange={(e) => setPrefs({ ...prefs, defaultRadius: Number(e.target.value) })}
                style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, minWidth: 180 }}>
                <option value={3}>3 miles</option>
                <option value={5}>5 miles</option>
                <option value={10}>10 miles (default)</option>
                <option value={25}>25 miles</option>
                <option value={50}>50 miles</option>
              </select>
            </div>
          </div>
        </Panel>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {saved && <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.teal, fontWeight: 600 }}><CheckCircle2 size={15} /> Settings saved</span>}
          <Button variant="primary" onClick={handleSave} style={{ padding: "12px 24px", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Save size={16} /> Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

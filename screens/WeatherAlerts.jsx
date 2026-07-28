import React, { useState, useEffect } from "react";
import { PageHeader, Panel, Toggle } from "../components";
import { Search, CloudRain, Wind, Droplets, TriangleAlert, Sun, Moon, Cloud } from "lucide-react";
import { C, S, fontDisplay, fontMono } from "../lib/theme";
import { api } from "../lib/api";

const ICON_MAP = { sunny: Sun, cloudy: Cloud, rain: CloudRain };

export default function WeatherAlerts() {
  const [notifDetail, setNotifDetail] = useState(true);
  const [notifLoc, setNotifLoc] = useState(true);
  const [notifSevere, setNotifSevere] = useState(false);
  const [search, setSearch] = useState("");
  const [forecast, setForecast] = useState(null);
  const [rain12h, setRain12h] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.weather.forecast().then((res) => {
      if (res?.success && res.data) {
        setForecast(res.data.forecast?.slice(0, 7) || []);
        if (res.data.rain_12h) setRain12h(res.data.rain_12h);
        if (res.data.alerts) setAlerts(res.data.alerts);
        if (res.data.current) setCurrent(res.data.current);
      } else {
        setError(res?.error || "Failed to load weather data");
      }
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const hasData = current || (forecast && forecast.length > 0);
  const days = forecast || [];
  const rainData = rain12h;
  const maxRain = rainData ? Math.max(...rainData) : 1;
  const alertList = alerts;
  const currentWeather = current;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <PageHeader icon={CloudRain} title="Smart weather alerts" subtitle="NWS forecasts, active storm alerts, and precipitation predictions" tone="warning" />
        <div style={{
          background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8,
          padding: "6px 12px", fontSize: 11, fontFamily: fontMono, color: C.textFaint,
          whiteSpace: "nowrap", marginTop: 6,
        }}>
          <span style={{ color: C.teal }}>&#9654;</span> 5-day forecast · Storm alerts · Settings
        </div>
      </div>

      {error && (
        <div style={{
          background: C.redDim, border: `1px solid ${C.red}55`, borderRadius: 12,
          padding: "14px 18px", marginBottom: 18, fontSize: 14, color: C.red,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 14 }} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <Search size={15} color={C.textFaint} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search a location"
              style={{
                width: "100%", background: C.panel2, border: `1px solid ${C.line}`,
                borderRadius: 10, padding: "12px 16px 12px 40px", color: C.text, fontSize: 14,
              }}
            />
          </div>

          {hasData && (
            <div style={{
              display: "flex", gap: 10, marginBottom: 14,
              overflowX: "auto", paddingBottom: 4,
            }}>
              {days.slice(0, 5).map((d, i) => (
                <Panel key={d.date || i} style={{
                  minWidth: 115, flex: 1, animation: `slideUp 0.3s ease ${i * 0.05}s both`,
                  background: i === 0 ? C.blueGlow : C.panel,
                  border: i === 0 ? `1px solid ${C.blue}44` : undefined,
                }}>
                  <div style={{ fontSize: 12, color: C.textFaint, fontWeight: 600, marginBottom: 4, fontFamily: fontMono }}>{d.day?.slice(0, 3) || "N/A"}</div>
                  <div style={{ fontFamily: fontDisplay, fontSize: 30, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>{d.temp_f}°</div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 2, fontWeight: 500 }}>{d.condition}</div>
                  {d.rain_probability > 0 && (
                    <div style={{ fontSize: 10, color: C.blue, marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                      <Droplets size={10} style={{ flexShrink: 0 }} />{d.rain_probability}%
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          )}

          {alertList.length > 0 && alertList.map((alert, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              background: C.redDim, border: `1px solid ${C.red}55`, borderRadius: 12,
              padding: "16px 18px", marginBottom: 14,
              animation: `slideIn 0.3s ease ${i * 0.1}s both`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: C.redGlow, display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <TriangleAlert size={18} color={C.red} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.red, marginBottom: 4 }}>{alert.headline}</div>
                <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{alert.description}</div>
              </div>
            </div>
          ))}

          <Panel title="Notification settings">
            {[
              ["Detailed location", "Refine alerts to your exact area", notifDetail, setNotifDetail],
              ["Location setting", "Share location for hyperlocal forecasts", notifLoc, setNotifLoc],
              ["Severe alerts only", "Mute routine forecast updates", notifSevere, setNotifSevere],
            ].map(([t, d, val, setter], i) => (
              <div key={t} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 0", borderBottom: i < 2 ? `1px solid ${C.lineSoft}` : "none",
              }}>
                <div>
                  <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{t}</div>
                  <div style={{ fontSize: 12, color: C.textFaint, marginTop: 2 }}>{d}</div>
                </div>
                <Toggle checked={val} onChange={() => setter(!val)} />
              </div>
            ))}
          </Panel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {currentWeather && (
            <Panel title="Current conditions" style={{ animation: "slideUp 0.3s ease" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: C.blueGlow, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <CloudRain size={28} color={C.blue} />
                  </div>
                  <div>
                    <div style={{ fontFamily: fontDisplay, fontSize: 42, fontWeight: 800, color: C.text, lineHeight: 1 }}>{currentWeather.temp_c}°<span style={{ fontSize: 18, color: C.textDim, fontWeight: 600 }}>C</span></div>
                    <div style={{ fontSize: 14, color: C.textDim, fontWeight: 500 }}>{currentWeather.condition}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 13, color: C.textDim, lineHeight: 2.2 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <Wind size={14} color={C.textFaint} />{currentWeather.wind_speed_mph} mph {currentWeather.wind_direction}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    <Droplets size={14} color={C.textFaint} />{currentWeather.humidity}%
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {rainData && (
            <Panel title="12-hour rain prediction" style={{ flex: 1, animation: "slideUp 0.3s ease 0.1s both" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 180, marginBottom: 8, paddingTop: 24 }}>
                {rainData.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontFamily: fontMono, fontSize: 9, color: C.textFaint }}>{v.toFixed(1)}</span>
                    <div style={{
                      width: "100%",
                      height: `${(v / maxRain) * 130}px`,
                      borderRadius: "4px 4px 0 0",
                      background: v > 4 ? `linear-gradient(180deg, ${C.red}, ${C.red}cc)` : v > 2 ? `linear-gradient(180deg, ${C.amber}, ${C.amber}cc)` : `linear-gradient(180deg, ${C.blue}, ${C.blue}cc)`,
                      transition: "height 0.3s ease",
                      minHeight: 4,
                    }} />
                    <span style={{ fontFamily: fontMono, fontSize: 8, color: C.textFaint }}>{i * 2}h</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

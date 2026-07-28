import React, { useState, useEffect } from "react";
import { C, S, fontDisplay, fontMono } from "../lib/theme";
import Button from "./Button";
import { Shield, Navigation, Waves, Activity, Flame, CloudRain, Home, CheckCircle, ArrowRight } from "lucide-react";

const STORAGE_KEY = "beacon_ai_tutorial_done";

export function useTutorial() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        setActive(true);
      }
    }
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setActive(false);
  };

  const reopen = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setActive(true);
  };

  return { active, dismiss, reopen };
}

const STEPS = [
  {
    icon: Shield,
    title: "Welcome to Beacon.ai",
    desc: "Your real-time AI disaster situational awareness platform. Monitor floods, earthquakes, wildfires, weather alerts, and locate nearby emergency shelters in seconds.",
    highlight: "app",
  },
  {
    icon: Navigation,
    title: "Navigate using the sidebar",
    desc: "The sidebar on the left lists all modules. Each module monitors a different hazard or resource. Click any module to switch views instantly.",
    highlight: "sidebar",
  },
  {
    icon: Activity,
    title: "Module: Earthquake Info",
    desc: "Pulls live seismic events from the USGS feed. Adjust the magnitude slider to focus on stronger quakes. Switch tabs for safety tips and emergency contacts.",
    highlight: "app",
  },
  {
    icon: Flame,
    title: "Module: Wildfire Risk",
    desc: "Active fire hotspots detected by NASA FIRMS satellites. Animated markers show fire intensity. The conditions panel shows hotspot count and mean fire power.",
    highlight: "app",
  },
  {
    icon: Waves,
    title: "Module: Flood Monitoring",
    desc: "Real-time river gauge readings from USGS stations. Color-coded indicators show risk levels. The map shows gauge locations across the watershed.",
    highlight: "app",
  },
  {
    icon: CloudRain,
    title: "Module: Weather Alerts",
    desc: "NWS forecasts, severe storm alerts, and 12-hour rain predictions. Toggle notification settings to filter alerts by severity.",
    highlight: "app",
  },
  {
    icon: Home,
    title: "Module: Shelter Finder",
    desc: "Search open shelters by name or filter by facilities (pets allowed, ADA access, medical). The map shows shelter locations and capacity status.",
    highlight: "app",
  },
  {
    icon: CheckCircle,
    title: "You're all set",
    desc: "The status bar at the top shows the current alert context. Use the red Alerts button for active warnings. Reopen this guide anytime by clicking the ? icon in the top bar.",
    highlight: "app",
  },
];

export default function TutorialOverlay({ onDone }) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / total) * 100;

  const handleNext = () => {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      onDone();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <>
      <div style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(6, 13, 24, 0.75)",
        backdropFilter: "blur(6px)",
        animation: "fadeIn 0.3s ease",
      }} />

      <div style={{
        position: "fixed", zIndex: 9999,
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "min(480px, calc(100vw - 32px))",
        maxHeight: "calc(100vh - 80px)",
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 20,
        boxShadow: S.lg,
        animation: "slideUp 0.35s ease",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: C.panel2 }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`,
            transition: "width 0.4s ease",
            borderRadius: "0 2px 2px 0",
          }} />
        </div>

        {/* Step indicator */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "14px 20px 0",
          fontFamily: fontMono, fontSize: 11, color: C.textFaint,
        }}>
          <span>{step + 1} / {total}</span>
          <button
            onClick={onDone}
            style={{
              background: "none", border: "none", color: C.textFaint, cursor: "pointer",
              fontFamily: fontMono, fontSize: 11, padding: "4px 8px", borderRadius: 6,
            }}
          >
            Skip
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px 24px", flex: 1, overflowY: "auto" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `${C.blue}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 18,
            boxShadow: `0 0 24px ${C.blue}22`,
          }}>
            <Icon size={28} color={C.blue} strokeWidth={2} />
          </div>

          <h2 style={{
            fontFamily: fontDisplay, fontWeight: 800, fontSize: 24,
            color: C.text, margin: "0 0 10px", lineHeight: 1.1,
          }}>
            {current.title}
          </h2>

          <p style={{
            fontSize: 15, color: C.textDim, lineHeight: 1.7, margin: 0,
          }}>
            {current.desc}
          </p>

          {/* Module tips / inline hints */}
          {current.highlight === "sidebar" && (
            <div style={{
              marginTop: 18, padding: 14, background: C.panel2,
              borderRadius: 12, border: `1px solid ${C.lineSoft}`,
              fontSize: 13, color: C.textDim, lineHeight: 1.6,
            }}>
              <strong style={{ color: C.text, display: "block", marginBottom: 4 }}>Pro tip:</strong>
              You can collapse the sidebar with the <span style={{ fontFamily: fontMono, fontSize: 11, color: C.blue }}>Toggle</span> button at the top-left to give the main view more space.
            </div>
          )}

          {step === 0 && (
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18,
            }}>
              {[
                { icon: Waves, label: "Flood", color: C.amber },
                { icon: Activity, label: "Quake", color: C.blue },
                { icon: Flame, label: "Fire", color: C.red },
                { icon: CloudRain, label: "Weather", color: C.blue },
                { icon: Home, label: "Shelters", color: C.teal },
              ].map((m) => (
                <div key={m.label} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8,
                  background: `${m.color}15`, border: `1px solid ${m.color}33`,
                  fontSize: 12, color: m.color, fontWeight: 600,
                }}>
                  <m.icon size={14} /> {m.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 20px 16px", gap: 10,
        }}>
          <Button variant="ghost" onClick={handleBack} disabled={step === 0}
            ariaLabel="Previous step"
            style={{ visibility: step === 0 ? "hidden" : "visible", padding: "10px 16px", fontSize: 13 }}>
            Back
          </Button>

          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 18 : 7,
                height: 7,
                borderRadius: 4,
                background: i === step ? C.blue : C.line,
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>

          <Button variant="primary" onClick={handleNext} ariaLabel={step < total - 1 ? "Next step" : "Finish tutorial"}
            style={{ padding: "10px 20px", fontSize: 13 }}>
            {step < total - 1 ? (
              <><ArrowRight size={14} /> Next</>
            ) : (
              "Get started"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

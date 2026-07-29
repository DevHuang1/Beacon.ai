import React, { useState } from "react";
import { TopBar, StatusRibbon, SideNav, AlertDrawer } from "../components";
import TutorialOverlay, { useTutorial } from "../components/Tutorial";
import screens from "../screens";
import theme, { fontBody } from "../lib/theme";

export default function Home() {
  const [active, setActive] = useState("escape");
  const [alertOpen, setAlertOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const tutorial = useTutorial();

  const screensMap = {
    escape: screens.escape,
    route: screens.route,
    shelters: screens.shelters,
    family: screens.family,
    profile: screens.profile,
    flood: screens.flood,
    wildfire: screens.wildfire,
    earthquake: screens.earthquake,
    weather: screens.weather,
  };
  const Screen = screensMap[active] || screens.escape;

  return (
    <div style={{ fontFamily: fontBody, background: theme.C.bg, minHeight: "100vh", color: theme.C.text }}>
      <a className="skip-link" href="#main">Skip to main content</a>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <header>
          <TopBar
            active={active}
            onNavigate={setActive}
            onOpenAlert={() => setAlertOpen(true)}
            onToggleNav={() => setCollapsed((c) => !c)}
            onHelp={tutorial.reopen}
          />
        </header>
        <StatusRibbon activeModule={active} />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <nav aria-label="Main modules">
            <SideNav active={active} onNavigate={setActive} collapsed={collapsed} />
          </nav>

          <main id="main" className="scrollbar" style={{ flex: 1, overflowY: "auto", padding: 22 }}>
            <Screen />
          </main>
        </div>
      </div>
      <AlertDrawer open={alertOpen} onClose={() => setAlertOpen(false)} />
      {tutorial.active && <TutorialOverlay onDone={tutorial.dismiss} />}
    </div>
  );
}

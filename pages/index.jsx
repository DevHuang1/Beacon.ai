import React, { useState } from "react";
import { TopBar, StatusRibbon, SideNav, AlertDrawer } from "../components";
import TutorialOverlay, { useTutorial } from "../components/Tutorial";
import EmergencyAlertListener from "../components/EmergencyAlertListener";
import screens from "../screens";
import theme, { fontBody } from "../lib/theme";
import { useIsMobile } from "../lib/useIsMobile";

export default function Home() {
  const [active, setActive] = useState("escape");
  const [alertOpen, setAlertOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const tutorial = useTutorial();
  const isMobile = useIsMobile();

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

  const handleNavigate = (id) => {
    setActive(id);
    setMobileNavOpen(false);
  };

  return (
    <div style={{ fontFamily: fontBody, background: theme.C.bg, minHeight: "100vh", color: theme.C.text }}>
      <a className="skip-link" href="#main">Skip to main content</a>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <header>
          <TopBar
            active={active}
            onNavigate={setActive}
            onOpenAlert={() => setAlertOpen(true)}
            onToggleNav={() => isMobile ? setMobileNavOpen(true) : setCollapsed((c) => !c)}
            onHelp={tutorial.reopen}
          />
        </header>
        <StatusRibbon activeModule={active} />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {!isMobile && (
            <nav aria-label="Main modules">
              <SideNav active={active} onNavigate={setActive} collapsed={collapsed} />
            </nav>
          )}

          <main id="main" className="scrollbar" style={{ flex: 1, overflowY: "auto", padding: isMobile ? 12 : 22 }}>
            <Screen />
          </main>
        </div>
      </div>
      {isMobile && mobileNavOpen && (
        <SideNav active={active} onNavigate={handleNavigate} mobile onClose={() => setMobileNavOpen(false)} />
      )}
      <AlertDrawer open={alertOpen} onClose={() => setAlertOpen(false)} />
      <EmergencyAlertListener />
      {tutorial.active && <TutorialOverlay onDone={tutorial.dismiss} />}
    </div>
  );
}

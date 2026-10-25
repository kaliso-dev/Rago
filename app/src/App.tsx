import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApplyBar } from "./components/ApplyBar";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { LicenseNotice } from "./components/LicenseNotice";
import { PageBoundary } from "./components/PageBoundary";
import { ReviewDialog } from "./components/ReviewDialog";
import { ResetToast } from "./components/ResetToast";
import { ReviewPrompt } from "./components/ReviewPrompt";
import { RunOverlay } from "./components/RunOverlay";
import { SearchPalette } from "./components/SearchPalette";
import { Splash } from "./components/Splash";
import { Upsell } from "./components/Upsell";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { useStore } from "./lib/store";
import { Dashboard } from "./pages/Dashboard";
import { ModulePage } from "./pages/ModulePage";
import { Settings } from "./pages/Settings";
import { Share } from "./pages/Share";
import { Games } from "./pages/Games";
import { isNetworkTab, Network } from "./pages/Network";
import { Tools } from "./pages/Tools";

export function App() {
  const { page, motion: motionPref, lang } = useStore();
  const scroller = useRef<HTMLElement>(null);
  const [splash, setSplash] = useState(true);
  const endSplash = useCallback(() => setSplash(false), []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [page]);

  // le clic droit natif n'a rien à faire dans une app de bureau
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("input, textarea, .run-console")) e.preventDefault();
    };
    window.addEventListener("contextmenu", h);
    return () => window.removeEventListener("contextmenu", h);
  }, []);

  return (
    <MotionConfig reducedMotion={motionPref === "reduced" ? "always" : "user"}>
      <div className={`app${motionPref === "reduced" ? " reduced" : ""}`}>
        <TitleBar />
        <div className="body">
          <Sidebar />
          <main className="main" ref={scroller}>
            <LicenseNotice />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                // les onglets de Réseau changent dans la page, sans la rejouer
                key={isNetworkTab(page) ? "network" : page}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                <PageBoundary lang={lang}>
                  {page === "dashboard" ? <Dashboard /> : page === "settings" ? <Settings /> : page === "share" ? <Share /> : page === "games" ? <Games /> : isNetworkTab(page) ? <Network tab={page} /> : page === "tools" ? <Tools /> : <ModulePage id={page} />}
                </PageBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
          <ApplyBar />
          <RunOverlay />
        </div>
        <ConfirmDialog />
        <SearchPalette />
        <Upsell />
        <ReviewPrompt />
        <ReviewDialog />
        <ResetToast />
        <AnimatePresence>{splash && <Splash onDone={endSplash} />}</AnimatePresence>
      </div>
    </MotionConfig>
  );
}

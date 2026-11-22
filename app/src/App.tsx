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
import { PrintDefs } from "./components/ri";
import { useStore } from "./lib/store";
import { Dashboard } from "./pages/Dashboard";
import { ModulePage } from "./pages/ModulePage";
import { Settings } from "./pages/Settings";
import { Share } from "./pages/Share";
import { Games } from "./pages/Games";
import { isNetworkTab, Network } from "./pages/Network";
import { Tools } from "./pages/Tools";
import { Analysis } from "./pages/Analysis";
import { Display } from "./pages/Display";
import { Mouse } from "./pages/Mouse";

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

  // titres d'affiche (charte v5) : l'écho en contour reprend le texte, la taille suit la largeur disponible
  useEffect(() => {
    const main = scroller.current;
    if (!main) return;
    const fit = () => {
      main.querySelectorAll<HTMLElement>(".page-head h1").forEach((h) => {
        const txt = h.textContent ?? "";
        if (h.dataset.t !== txt) h.dataset.t = txt;
        const head = h.closest(".page-head") ?? h.parentElement;
        const room = (head?.clientWidth ?? 900) - (head?.querySelector(".head-side")?.clientWidth ?? 0) - 60;
        // Barlow Condensed 900 italique : environ 0,5 em par lettre en capitales
        const size = Math.max(56, Math.min(112, Math.floor(room / (Math.max(txt.length, 4) * 0.52))));
        h.style.setProperty("--title-size", `${size}px`);
      });
    };
    fit();
    const mo = new MutationObserver(fit);
    mo.observe(main, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", fit);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

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
        <PrintDefs />
        <Sidebar />
        <div className="body">
          <TitleBar />
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
                  {page === "dashboard" ? <Dashboard /> : page === "settings" ? <Settings /> : page === "share" ? <Share /> : page === "games" ? <Games /> : page === "display" ? <Display /> : page === "mouse" ? <Mouse /> : isNetworkTab(page) ? <Network tab={page} /> : page === "tools" ? <Tools /> : page === "analysis" ? <Analysis /> : <ModulePage id={page} />}
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

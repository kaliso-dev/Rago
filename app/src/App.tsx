import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { ApplyBar } from "./components/ApplyBar";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { RunOverlay } from "./components/RunOverlay";
import { SearchPalette } from "./components/SearchPalette";
import { Upsell } from "./components/Upsell";
import { Sidebar } from "./components/Sidebar";
import { TitleBar } from "./components/TitleBar";
import { useStore } from "./lib/store";
import { Dashboard } from "./pages/Dashboard";
import { ModulePage } from "./pages/ModulePage";
import { Settings } from "./pages/Settings";

export function App() {
  const { page, motion: motionPref, lang } = useStore();
  const scroller = useRef<HTMLElement>(null);

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
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={page}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {page === "dashboard" ? <Dashboard /> : page === "settings" ? <Settings /> : <ModulePage id={page} />}
              </motion.div>
            </AnimatePresence>
          </main>
          <ApplyBar />
          <RunOverlay />
        </div>
        <ConfirmDialog />
        <SearchPalette />
        <Upsell />
      </div>
    </MotionConfig>
  );
}

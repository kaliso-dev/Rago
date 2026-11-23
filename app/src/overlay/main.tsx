import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/fonts.css";
// maquette v5 app-ingame (rendus-v5/src/ingame.css), comme la fenêtre principale (main.tsx)
import "../s5/base.css";
import "../s5/pages/ingame.css";
import "../s5/overlay.css";
import { IconDefs } from "../s5/I";
import { Overlay } from "./Overlay";

document.documentElement.classList.add("round");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IconDefs />
    <Overlay />
  </StrictMode>,
);

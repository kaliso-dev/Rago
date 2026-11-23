import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/account.css";
import "./styles/features.css";
import "./styles/mouse.css";
import "./styles/v5.css";
// maquettes v5 reprises telles quelles (23/11/2026) : après l'ancien style, qui ne sert plus qu'aux pages pas encore refaites
import "./s5/base.css";
import "./s5/app.css";
import "./s5/pages/pg-dash.css";
import "./s5/pages/pg-games.css";
import "./s5/pages/empty.css";
import "./s5/pages/picker.css";
import "./s5/pages/pg-display.css";
import "./s5/pages/vs.css";
import "./s5/pages/module.css";
import "./s5/pages/net.css";
import "./s5/pages/tools.css";

document.documentElement.classList.add("round", "poster");
import { App } from "./App";
import { StoreProvider } from "./lib/store";
import { AccountProvider } from "./lib/account";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <AccountProvider>
        <App />
      </AccountProvider>
    </StoreProvider>
  </StrictMode>,
);

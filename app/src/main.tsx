import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/account.css";
import "./styles/features.css";
import "./styles/mouse.css";
import "./styles/v5.css";
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

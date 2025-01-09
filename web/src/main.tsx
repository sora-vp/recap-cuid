import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { SettingsRetreiever } from "./components/settings-retriever";

import { Toaster } from "@/components/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsRetreiever>
      <App />
    </SettingsRetreiever>
    <Toaster richColors />
  </StrictMode>,
);

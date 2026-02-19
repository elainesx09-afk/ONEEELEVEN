import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyTenantFromUrl } from "./lib/tenant.ts";

// Se veio token/workspace pela URL, salva ANTES do app iniciar
applyTenantFromUrl();

createRoot(document.getElementById("root")!).render(<App />);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initClientObservability } from "./sentry";
import "./index.css";
import App from "./App";

initClientObservability();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

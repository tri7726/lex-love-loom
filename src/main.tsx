import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle Vite dynamic import errors (Chunk Load Errors)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected:', event);
  // Auto-reload to fetch the latest assets
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


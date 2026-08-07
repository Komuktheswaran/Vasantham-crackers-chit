import "./polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import "antd/dist/reset.css";
import App from "./App";

// Sentry browser SDK — captures unhandled errors, route changes, and (optionally)
// session replays. No-op when VITE_SENTRY_DSN is unset.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      // 10s pre-error replay buffer; recording starts only when something fails.
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Wrap the tree in Sentry's ErrorBoundary so a thrown component error shows
// a fallback UI instead of a blank screen, AND gets reported.
const FallbackUI = ({ error, resetError }) => (
  <div style={{ padding: 32, fontFamily: "sans-serif" }}>
    <h2>Something went wrong</h2>
    <p style={{ color: "#888" }}>{error?.message || "Unknown error"}</p>
    <button onClick={resetError}>Reload this view</button>
  </div>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={FallbackUI}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { TenantProvider } from "./context/TenantContext";
import "./index.css";

async function enableMocking() {
  const { worker } = await import("./mocks/browser");
  return worker.start({ onUnhandledRequest: "bypass" });
}

async function startApp() {
  await enableMocking();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <TenantProvider>
        <App />
      </TenantProvider>
    </StrictMode>,
  );
}

void startApp();

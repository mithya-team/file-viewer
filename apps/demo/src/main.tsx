import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import CitationScrollDemo from "./CitationScrollDemo";
import "./styles.css";

const rootElement = document.getElementById("root");
if (rootElement == null) {
  throw new Error("Missing #root element.");
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

const path = normalizePath(window.location.pathname);
const Page = path === "/citation" ? CitationScrollDemo : App;

createRoot(rootElement).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);

import { createRoot } from "react-dom/client";
import HomePage from "../components/HomePage";
import brandLogoSrc from "virtual:brand-logo";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Standalone root element not found.");
}

createRoot(rootElement).render(<HomePage brandLogoSrc={brandLogoSrc} />);

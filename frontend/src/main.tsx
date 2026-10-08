import { createRoot } from "react-dom/client";
import "@fontsource-variable/hubot-sans";
import App from "./App.tsx";
import "./index.css";
import "react-loading-skeleton/dist/skeleton.css";

createRoot(document.getElementById("root")!).render(<App />);

import "./styles.css";
import "./standalone.css";
import { mountSquirrelSafari } from "./app";
const cleanup = mountSquirrelSafari(
  document.querySelector<HTMLElement>("#app")!,
);
if (import.meta.hot) import.meta.hot.dispose(cleanup);

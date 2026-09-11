import "./styles.css";
import "./standalone.css";
import { mountSquirrelSafari } from "./app";
import { mountAnalytics } from "./analytics";
const cleanup = mountSquirrelSafari(
  document.querySelector<HTMLElement>("#app")!,
);
// Development and embedding stay independent of the site's analytics setup.
const cleanupAnalytics = import.meta.env.PROD
  ? mountAnalytics(document.querySelector<HTMLElement>("#app")!)
  : () => {};
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cleanupAnalytics();
    cleanup();
  });

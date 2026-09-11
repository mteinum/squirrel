import { missions } from "./state";
import { acorn, element } from "./ui";

type Mission = (typeof missions)[number];

/** A short, non-interactive reward. No render loop or WebGL is needed. */
export function createCelebration(park: HTMLElement) {
  const layer = element("div", "badge-celebration");
  // The existing status toast announces the same discovery without duplicates.
  layer.setAttribute("aria-hidden", "true");
  layer.hidden = true;
  park.append(layer);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const abort = new AbortController();
  const animations = new Set<Animation>();
  let timer = 0;
  let disposed = false;

  function stopAnimations() {
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  }
  function clear() {
    clearTimeout(timer);
    stopAnimations();
    layer.hidden = true;
    layer.replaceChildren();
  }
  function animate(
    target: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    if (motion.matches || !target.animate) return;
    const animation = target.animate(frames, options);
    animations.add(animation);
    void animation.finished.then(
      () => animations.delete(animation),
      () => animations.delete(animation),
    );
  }
  function show(earned: readonly Mission[], complete: ReadonlySet<string>) {
    if (disposed || !earned.length) return;
    clear();
    if (document.hidden) return;
    const finished = complete.size === missions.length;
    const card = element(
      "div",
      `celebration-card${finished ? " trail-complete" : ""}`,
    );
    const medal = element("div", "celebration-medal");
    medal.innerHTML = acorn;
    const collection = element("div", "celebration-collection");
    for (const mission of missions) {
      const badge = element(
        "span",
        complete.has(mission.id) ? "collected" : "",
      );
      badge.innerHTML = acorn;
      collection.append(badge);
    }
    card.append(
      element(
        "p",
        "celebration-kicker",
        finished
          ? "DISCOVERY TRAIL COMPLETE"
          : "A LITTLE DISCOVERY. A BIG MOMENT.",
      ),
      medal,
      element(
        "h2",
        "celebration-title",
        finished
          ? "You found all five!"
          : earned.length === 1
            ? earned[0].title
            : `${earned.length} acorns collected!`,
      ),
      element(
        "p",
        "celebration-detail",
        earned.length === 1 && !finished
          ? `${earned[0].detail} · Acorn earned`
          : earned.map((mission) => mission.title).join(" · "),
      ),
      collection,
      element(
        "p",
        "celebration-progress",
        finished
          ? "A full collection. Keep following your curiosity."
          : `${complete.size} of ${missions.length} discovery acorns`,
      ),
    );
    layer.append(card);
    layer.hidden = false;

    if (!motion.matches) {
      const halo = element("div", "celebration-halo");
      layer.prepend(halo);
      animate(
        halo,
        [
          { opacity: 0, transform: "scale(0.45) rotate(-15deg)" },
          { opacity: 0.7, offset: 0.25 },
          { opacity: 0, transform: "scale(1.2) rotate(15deg)" },
        ],
        { duration: 1400, easing: "ease-out", fill: "forwards" },
      );
      const compact = park.clientWidth < 600;
      const count = compact ? 20 : finished ? 44 : 32;
      const radius = Math.min(park.clientWidth * 0.48, 330);
      const colours = ["#dba83e", "#c66b3d", "#64825a", "#f1cd70"];
      for (let i = 0; i < count; i++) {
        const particle = element("span", "celebration-particle");
        particle.classList.add(
          i % 4 === 0 ? "tiny-acorn" : i % 3 === 0 ? "spark" : "leaf",
        );
        if (i % 4 === 0) particle.innerHTML = acorn;
        particle.style.color = colours[i % colours.length];
        const angle = (i / count) * Math.PI * 2;
        const distance = radius * (0.65 + Math.random() * 0.35);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance * 0.8;
        const turn = Math.round(Math.random() * 400 - 200);
        layer.append(particle);
        animate(
          particle,
          [
            {
              opacity: 0,
              transform: "translate(0, 0) scale(0.4) rotate(0deg)",
            },
            { opacity: 1, offset: 0.12 },
            {
              opacity: 1,
              transform: `translate(${x}px, ${y}px) scale(1) rotate(${turn}deg)`,
              offset: 0.65,
            },
            {
              opacity: 0,
              transform: `translate(${x * 1.15}px, ${y + 65}px) scale(0.7) rotate(${turn + 80}deg)`,
            },
          ],
          {
            duration: 1500 + (i % 5) * 110,
            delay: (i % 4) * 35,
            easing: "cubic-bezier(.16,.7,.3,1)",
            fill: "both",
          },
        );
      }
      animate(
        medal,
        [
          { transform: "scale(0.6) rotate(-22deg)" },
          { transform: "scale(1.15) rotate(8deg)", offset: 0.6 },
          { transform: "scale(1) rotate(0deg)" },
        ],
        { duration: 650, easing: "ease-out" },
      );
      animate(
        card,
        [
          { opacity: 0, transform: "translateY(18px) scale(0.9)" },
          { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.1 },
          { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.88 },
          { opacity: 0, transform: "translateY(-8px) scale(0.98)" },
        ],
        { duration: 3600, easing: "ease-out", fill: "both" },
      );
    }
    timer = window.setTimeout(clear, 3700);
  }

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) clear();
    },
    { signal: abort.signal },
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") clear();
    },
    { signal: abort.signal },
  );
  motion.addEventListener(
    "change",
    () => {
      if (!motion.matches) return;
      stopAnimations();
      layer
        .querySelectorAll(".celebration-particle, .celebration-halo")
        .forEach((node) => node.remove());
    },
    { signal: abort.signal },
  );

  return {
    show,
    clear,
    dispose() {
      disposed = true;
      clear();
      abort.abort();
      layer.remove();
    },
  };
}

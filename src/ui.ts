import { behaviourKeys, type Observation } from "./data/types";
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export const label = (value: string): string =>
  value.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
export function dateLabel(date: string | null): string {
  return date
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T12:00:00Z`))
    : "Unknown date";
}
export const acorn =
  '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 14h16c0 9-5 13-8 15-4-2-8-6-8-15Z" fill="currentColor" opacity=".7"/><path d="M5 14c0-11 22-11 22 0H5Z" fill="currentColor"/><path d="M16 6q0-4 4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
export const icon = (name: string) => {
  const paths: Record<string, string> = {
    compass:
      '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
    book: '<path d="M4 4h7v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm9 0h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7V4Z"/>',
    shuffle:
      '<path d="m17 3 4 4-4 4M3 17l5-1L16 7h5M3 7l5 1 3 4m3 3 3 2h4m-4-4 4 4-4 4"/>',
    reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
    top: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v8h14v-8"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.compass}</svg>`;
};
export function shell(): string {
  return `<div class="safari">
    <a class="skip-link" href="#safari-panel">Skip to observation controls</a>
    <header class="app-header"><div class="brand"><span class="brand-mark">${acorn}</span><div><h1>Squirrel Safari<span class="brand-dot">.</span></h1><p>A CENTRAL PARK FIELD TRIP</p></div></div><div class="edition"><span class="status-dot"></span> AUTUMN 2018 <span class="edition-divider">/</span> NEW YORK CITY</div><button class="header-notebook" data-view="notebook">${icon("book")}<span>Field notebook</span><span class="notebook-count">0</span></button></header>
    <main class="workspace">
      <section class="park" aria-label="Park exploration">
        <div class="scene" data-scene></div>
        <div class="park-intro"><p class="eyebrow">SMALL WONDERS, BIG CITY</p><h2>Take the scenic route.</h2><p>Every dot has a story. Find your next little discovery.<span class="mobile-gestures"><br>One finger: orbit · Two fingers: pan & pinch</span></p></div>
        <div class="map-status" role="status">Unfolding the park…</div>
        <div class="compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 40 40"><path d="m20 3 7 30-7-7-7 7Z" fill="currentColor"/></svg></div>
        <div class="map-tools" aria-label="Camera controls"><button data-action="reset-view" aria-label="Reset view" title="Reset view">${icon("reset")}</button><button data-action="top" aria-label="Top-down view" title="Top-down view">${icon("top")}</button><span></span><button data-action="zoom-in" aria-label="Zoom in" title="Zoom in">+</button><button data-action="zoom-out" aria-label="Zoom out" title="Zoom out">−</button></div>
        <div class="park-bottom"><div class="legend"><span><i class="fur-dot gray"></i>Gray</span><span><i class="fur-dot cinnamon"></i>Cinnamon</span><span><i class="fur-dot black"></i>Black</span><span><i class="fur-dot unknown"></i>Unknown</span></div><div class="map-caption"><span>Drag to orbit · Scroll to zoom · Right-drag to pan<br><span class="touch-help">Touch: one finger to orbit · two to pan & pinch</span></span><button data-view="list">${icon("list")} Observation list</button></div></div>
      </section>
      <aside id="safari-panel" class="panel" aria-label="Field guide" tabindex="-1">
        <div class="panel-tabs" role="group" aria-label="Field guide sections"><button data-view="filters" class="active">${icon("compass")} Explore</button><button data-view="missions">${acorn} Missions <span class="mission-count">0/5</span></button><button data-view="notebook">${icon("book")} Notebook</button></div>
        <div class="panel-scroll">
          <section data-pane="filters"><div class="section-heading"><p class="eyebrow">YOUR POCKET FIELD GUIDE</p><h2>A park full of characters.</h2><p>Follow your curiosity. Who will you spot today?</p></div>
            <button class="surprise primary" data-action="surprise">${icon("shuffle")} Surprise me ${icon("arrow")}</button>
            <div class="filter-heading"><h3>Narrow the search</h3><button class="text-button" data-action="clear">Clear all</button></div>
            <div class="filters"><label>Fur colour<select name="fur"><option value="">All coats</option></select></label><label>Behaviour<select name="behaviour"><option value="">Any behaviour</option></select></label><label>Census date<select name="date"><option value="">All dates</option></select></label><label>Time of day<select name="shift"><option value="">AM & PM</option><option>AM</option><option>PM</option><option>Unknown</option></select></label></div>
            <p class="filter-help">Filters combine with AND: a sighting must match every choice, including list search.</p>
            <div class="matching"><span class="matching-number">—</span><div>matching observations<br><span>Little moments, recorded by real people.</span></div></div>
            <p class="empty-state" data-empty hidden>No sightings match this combination. Try another filter or clear all to explore again.</p>
            <button class="list-link" data-view="list">Browse the observations ${icon("arrow")}</button>
            <div class="mission-teaser"><span class="teaser-acorn">${acorn}</span><div><h3>A little curiosity goes a long way.</h3><p>Five discoveries. Five acorns to collect.</p><button class="text-button" data-view="missions">See your missions →</button></div></div>
          </section>
          <section data-pane="observation" hidden><button class="text-button back" data-view="filters">← Back to exploring</button><div class="observation-hero"><div data-portrait class="portrait" aria-label="Illustrative squirrel portrait">🐿</div><span class="specimen-tag">FIELD OBSERVATION</span></div><div data-card></div><div class="card-actions"><button data-action="share" class="primary">${icon("share")} Copy sighting link</button><button data-action="fly" class="secondary">${icon("compass")} Find in park</button></div><div data-share-fallback hidden><label>Copy this link<input readonly name="share-link" /></label></div><button class="surprise secondary" data-action="surprise">${icon("shuffle")} Another little discovery</button></section>
          <section data-pane="missions" hidden><p class="eyebrow">COLLECT A LITTLE CURIOSITY</p><h2>Your discovery trail</h2><p>Select real observations to earn five acorn badges. A single sighting can unlock more than one.</p><div class="mission-progress"><span class="mission-count">0/5</span><progress max="5" value="0" aria-label="Discovery missions completed"></progress></div><div data-missions></div><button class="surprise primary" data-action="surprise">${icon("shuffle")} Take me somewhere</button></section>
          <section data-pane="notebook" hidden><p class="eyebrow">LITTLE MOMENTS, KEPT CLOSE</p><h2>Your field notebook</h2><p>Every observation you select is tucked away here, in this browser only.</p><div data-notebook></div><button class="text-button reset-progress" data-action="reset-progress">Reset discoveries & mission progress</button></section>
          <section data-pane="list" hidden><p class="eyebrow">A DIFFERENT WAY TO EXPLORE</p><h2>Observation index</h2><p>The same real sightings, with no 3D required. Your filters apply here too.</p><label class="search-label">Search ID, coat, age or notes<input name="query" type="search" placeholder="Try “peanut” or an observation ID" /></label><div class="list-summary"><span data-list-count></span><button class="text-button" data-view="filters">Edit filters</button><button class="text-button" data-action="clear">Clear all</button></div><div data-list></div><div class="pagination"><button class="secondary" data-action="previous">← Previous</button><span data-page></span><button class="secondary" data-action="next">Next →</button></div></section>
          <footer class="field-footer"><span class="footer-leaf">✳</span><p><strong>Real sightings. A little imagination.</strong><br>2018 census observations, not live locations or a count of distinct animals. Trees, water, paths & squirrel scale are illustrative.</p><details><summary>Sources & field notes</summary><p>Sightings: <a href="https://data.cityofnewyork.us/Environment/2018-Central-Park-Squirrel-Census-Squirrel-Data/vfnx-vebw" target="_blank" rel="noreferrer">The Squirrel Census / NYC Open Data</a>. Park outline: <a href="https://data.cityofnewyork.us/Recreation/Functional-Parkland/xhvt-s4va" target="_blank" rel="noreferrer">NYC Parks, Functional Parkland</a>.</p><p data-provenance></p><p>Positions retain relative geographic spacing. Models are enlarged for legibility. This is an autumn diorama, not a surveyed map. Discoveries stay on this device; clearing browser storage removes them.</p></details><address class="creator-contact"><span>Made by Morten Teinum</span><a href="mailto:morten@teinum.no">morten@teinum.no</a></address></footer>
        </div>
      </aside>
    </main>
    <div class="toast" role="status" aria-live="polite" hidden></div>
  </div>`;
}
export function renderCard(
  host: HTMLElement,
  o: Observation,
  filtered: boolean,
) {
  host.replaceChildren();
  host.append(
    element(
      "p",
      "eyebrow",
      `${o.fur ?? "Unknown coat"} · ${o.age ?? "Unknown age"}`,
    ),
  );
  const title = element(
    "h2",
    "",
    `${o.fur === "Black" ? "A little midnight." : o.fur === "Cinnamon" ? "A dash of cinnamon." : o.fur === "Gray" ? "A familiar little face." : "A mystery in the park."}`,
  );
  title.tabIndex = -1;
  host.append(title);
  host.append(element("p", "observation-id", o.observationId));
  if (o.id !== o.observationId)
    host.append(
      element(
        "p",
        "fine-print",
        "Repeated source ID · this record has a unique share link.",
      ),
    );
  if (filtered)
    host.append(
      element(
        "p",
        "selected-notice",
        "This selected sighting is outside your current filters. It stays highlighted on the map.",
      ),
    );
  const facts = element("dl", "facts");
  const values = [
    ["Spotted", dateLabel(o.date)],
    [
      "Shift",
      o.shift
        ? `${o.shift} · ${o.shift === "AM" ? "Morning" : "Afternoon"}`
        : "Unknown",
    ],
    ["Location", o.location ?? "Unknown"],
    [
      "Height",
      o.heightValue !== null
        ? `${o.heightValue} (source units unspecified)`
        : "Unknown / not recorded",
    ],
    ["Fur highlights", o.highlightFur ?? "Unknown"],
  ];
  values.forEach(([name, value]) => {
    const group = element("div");
    group.append(element("dt", "", name), element("dd", "", value));
    facts.append(group);
  });
  host.append(facts);
  host.append(element("h3", "", "Caught in the moment"));
  const badges = element("div", "behaviour-badges");
  const active = behaviourKeys.filter((b) => o.behaviours[b] === true);
  active.forEach((b) =>
    badges.append(element("span", "behaviour-badge", label(b))),
  );
  if (!active.length)
    badges.append(element("p", "fine-print", "No behaviours marked yes."));
  host.append(badges);
  const details = element("details", "all-behaviours");
  details.append(element("summary", "", "All recorded behaviour flags"));
  const flags = element("dl", "flag-list");
  behaviourKeys.forEach((b) => {
    const row = element("div");
    row.append(
      element("dt", "", label(b)),
      element(
        "dd",
        "",
        o.behaviours[b] === null ? "Unknown" : o.behaviours[b] ? "Yes" : "No",
      ),
    );
    flags.append(row);
  });
  details.append(flags);
  host.append(details);
  const notes = element("div", "observer-notes");
  notes.append(element("h3", "", "From the field notes"));
  const actualNotes = o.notes.filter(
    (n) => n.field !== "combination_of_primary_and",
  );
  if (!actualNotes.length)
    notes.append(element("p", "", "No observer notes recorded."));
  actualNotes.forEach((n) => {
    notes.append(
      element("p", "note-label", label(n.field)),
      element("p", "note-text", n.text),
    );
  });
  host.append(
    notes,
    element(
      "p",
      "fine-print",
      `Recorded position: ${o.latitude.toFixed(6)}, ${o.longitude.toFixed(6)}. Historical sighting; not an individual animal profile.`,
    ),
  );
}
export function observationButton(o: Observation): HTMLButtonElement {
  const button = element("button", "observation-row");
  button.dataset.observation = o.id;
  const dot = element("i", `fur-dot ${(o.fur ?? "Unknown").toLowerCase()}`);
  dot.setAttribute("aria-hidden", "true");
  const content = element("span");
  content.append(
    element("strong", "", o.observationId),
    element(
      "small",
      "",
      `${o.fur ?? "Unknown coat"} · ${dateLabel(o.date)} · ${o.shift ?? "Unknown shift"}${o.id !== o.observationId ? ` · record ${o.id.split("~").at(-1)}` : ""}`,
    ),
  );
  button.append(dot, content, element("span", "row-arrow", "↗"));
  return button;
}

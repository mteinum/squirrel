import { behaviourKeys, type Observation } from "./data/types";
import { fieldLabel, nickname, squirrelActivity } from "./field-guide";
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
export const label = fieldLabel;
export function dateLabel(date: string | null): string {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date)
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
    coffee:
      '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h2a3 3 0 1 1 0 6h-2M2 22h18M7 2v3m5-3v3"/>',
    binoculars:
      '<path d="m4 5-2 11a4 4 0 0 0 8 0V7L8 4H5Zm16 0 2 11a4 4 0 0 1-8 0V7l2-3h3ZM10 10h4M10 14h4"/><circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/>',
    backpack:
      '<path d="M8 6V4a4 4 0 0 1 8 0v2M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v12H5ZM5 12h14M9 15h6v4H9ZM2 12v8h3M22 12v8h-3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h2m4 0h2m-8 3h2"/>',
    notes: '<path d="M8 4H4v18h16V4h-4M8 2h8v5H8ZM8 11h8m-8 4h8m-8 4h5"/>',
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
export const squirrelArt = `<svg viewBox="0 0 100 110" fill="none" aria-hidden="true"><path d="M46 82C5 96 1 49 17 33c14-15 38-6 31 10-3 7-15 5-14 14 1 7 8 9 18 11" fill="#B96832" stroke="#794926" stroke-width="2"/><path d="M21 38c-9 11-8 28 3 36M27 37c-8 12-7 23-1 29" stroke="#E4AD72" stroke-width="2" stroke-linecap="round"/><path d="M42 86c-9-19 0-38 17-40l1-20 10 11 8-9 1 18c13 5 15 16 6 21l-9 3c8 17-1 27-18 26H39c-4-5 0-9 9-9" fill="#BC7D42" stroke="#794926" stroke-width="2" stroke-linejoin="round"/><path d="M60 62c-9 7-11 22-2 28 12 3 15-14 11-20" fill="#E9C598"/><circle cx="78" cy="50" r="2.5" fill="#26352E"/><path d="m88 58 4 1-4 3M68 69l13 6M59 96h21" stroke="#794926" stroke-width="3" stroke-linecap="round"/><path d="M78 74h12c0 9-5 12-6 13-3-2-6-5-6-13Z" fill="#8A5B32"/><path d="M76 75c0-7 16-7 16 0H76Zm8-5 2-5" stroke="#604728" stroke-width="2" fill="#A58A57"/></svg>`;

function filterRow(
  name: string,
  title: string,
  symbol: string,
  first: string,
): string {
  return `<fieldset class="filter-row" data-filter-row="${name}"><legend>${icon(symbol)} ${title}</legend><div class="filter-options"><div class="filter-chips" data-chips="${name}"></div><details class="more-filter"><summary aria-label="More ${title.toLowerCase()} options">+</summary><label>All ${title.toLowerCase()} options<select name="${name}" aria-label="${title}"><option value="">${first}</option>${name === "shift" ? "<option>AM</option><option>PM</option><option>Unknown</option>" : ""}</select></label></details></div></fieldset>`;
}

function centralPerk(): string {
  return `<button type="button" class="perk-sign" data-action="central-perk" aria-label="Open Central Perk Easter egg" aria-haspopup="dialog" aria-expanded="false" aria-controls="central-perk-note" hidden>
    ${icon("coffee")}<span><strong>Central Perk <span class="perk-mobile-arrow" aria-hidden="true">→</span></strong><span class="perk-directions">97 squirrel steps · 4 human blocks →</span><small>Fictional detour</small></span>
  </button>
  <dialog class="perk-note" id="central-perk-note" aria-labelledby="perk-title" aria-describedby="perk-description">
    <p class="eyebrow">AN ENTIRELY FICTIONAL DETOUR</p>
    <h2 id="perk-title" tabindex="-1" autofocus>${icon("coffee")} Central Perk</h2>
    <p class="perk-subtitle">A suspiciously familiar coffeehouse.</p>
    <p id="perk-description">Unfortunately, our field researchers have been unable to locate it in Central Park.</p>
    <p class="perk-footnote">Possibly fictional.<br>Possibly run by squirrels.</p>
    <form method="dialog"><button class="secondary" type="submit">Return to the squirrels ${icon("arrow")}</button></form>
  </dialog>`;
}

export function shell(): string {
  return `<div class="safari">
    <a class="skip-link" href="#safari-panel">Skip to observation controls</a>
    <header class="app-header"><div class="brand"><span class="brand-mark">${squirrelArt}</span><div><h1>Squirrel Safari</h1><p>A CENTRAL PARK FIELD TRIP</p></div></div><nav class="header-nav panel-tabs" aria-label="Main navigation"><button data-view="filters" class="active" aria-pressed="true">${icon("binoculars")} Explore</button><button data-view="notes" aria-pressed="false">${icon("notes")} Field Notes</button><button data-view="missions" aria-pressed="false">${icon("compass")} Missions <span class="mission-count">0/5</span></button><button data-view="notebook" aria-pressed="false">${icon("book")} Notebook</button></nav><div class="edition"><span class="status-dot"></span> Autumn 2018 <span class="edition-divider">·</span> New York City</div><span class="header-note">Same park.<br>More squirrels.</span><button class="mobile-notebook" data-view="notebook" aria-label="Open your notebook">${icon("book")}<span class="notebook-count">0</span></button></header>
    <main class="workspace">
      <section class="park" aria-label="Park exploration">
        <div class="scene" data-scene></div>
        <div class="park-intro"><p class="eyebrow">SMALL WONDERS, BIG CITY</p><h2>Take the scenic route.</h2><p>Every squirrel has a story.<br>Find your next little discovery.</p><span class="intro-rule"></span></div>
        <div class="park-annotation" aria-hidden="true">“Nature is better<br>with squirrels.”<span>✳</span></div>
        <div class="map-status" role="status">Asking the squirrels where they are…</div>
        <div class="compass" aria-hidden="true"><span>N</span><svg viewBox="0 0 40 40"><path d="m20 3 7 30-7-7-7 7Z" fill="currentColor"/></svg></div>
        <div class="map-tools" role="group" aria-label="Camera controls"><button data-action="reset-view" aria-label="Reset view" title="Reset view">${icon("reset")}</button><button data-action="top" aria-label="Top-down view" title="Top-down view">${icon("top")}</button><span></span><button data-action="zoom-in" aria-label="Zoom in" title="Zoom in">+</button><button data-action="zoom-out" aria-label="Zoom out" title="Zoom out">−</button></div>
        <div class="map-pins" data-pins></div>
        ${centralPerk()}
        <div class="vision-message" role="status" hidden><strong>SQUIRREL VISION™</strong><span data-vision-count></span></div>
        <article class="featured-squirrel" aria-label="Featured squirrel" hidden><button class="featured-close" data-action="close-featured" aria-label="Close featured squirrel">×</button><div class="featured-illustration">${squirrelArt}<span>FIELD PORTRAIT · ILLUSTRATED</span></div><div class="featured-story" aria-live="polite"><p class="eyebrow">FEATURED SQUIRREL</p><h2 data-nickname></h2><p class="featured-note" data-featured-note></p><small>A playful field nickname</small></div><dl class="featured-facts" data-featured-facts></dl><button class="featured-details text-button" data-view="observation">Open field observation ${icon("arrow")}</button></article>
        <div class="park-bottom"><div class="legend" aria-label="Fur colour legend"></div><div class="map-caption"><span>Drag to orbit · Scroll to zoom · Right-drag to pan</span><div class="map-capsules"><button data-action="vision" aria-pressed="false">${icon("binoculars")} Squirrel Vision <span class="toggle-track" aria-hidden="true"></span></button><button data-view="list">${icon("list")} Observation list</button></div></div></div>
      </section>
      <aside id="safari-panel" class="panel" aria-label="Field guide" tabindex="-1">
        <div class="sheet-summary"><button class="sheet-handle" data-action="sheet" aria-expanded="false" aria-controls="notebook-content"><span class="sheet-grip" aria-hidden="true"></span><span><strong>Squirrel Safari</strong><small><span data-mobile-count>—</span> squirrels · <span data-sheet-label>Open field kit</span></small></span><span class="sheet-chevron" aria-hidden="true">⌃</span></button><button class="primary" data-action="surprise">${icon("binoculars")} Find me a squirrel ${icon("arrow")}</button></div>
        <div id="notebook-content" class="notebook-content"><nav class="sheet-tabs panel-tabs" aria-label="Field guide sections"><button data-view="filters" class="active" aria-pressed="true">${icon("binoculars")} Explore</button><button data-view="notes" aria-pressed="false">${icon("notes")} Field Notes</button><button data-view="missions" aria-pressed="false">${icon("compass")} Missions <span class="mission-count">0/5</span></button><button data-view="notebook" aria-pressed="false">${icon("book")} Notebook</button></nav><div class="panel-scroll">
          <div class="notebook-brand"><span class="notebook-seal">${acorn}</span><div><p>Squirrel Safari</p><small>A CENTRAL PARK FIELD TRIP</small></div><span class="curiosity-stamp">FIELD<br>CURIOSITY<br>ALWAYS PAYS</span></div>
          <section data-pane="filters"><div class="section-heading"><p class="eyebrow">${icon("binoculars")} YOUR MISSION</p><h2>Find someone doing <br>squirrel things.</h2><p>Explore. Observe. Get delightfully distracted.</p></div>
            <button class="surprise primary" data-action="surprise">${icon("binoculars")} Find me a squirrel ${icon("arrow")}</button>
            <p class="radar-status" role="status"><span data-radar>Small adventures. Excellent company.</span></p>
            <div class="filter-heading"><div>${icon("backpack")}<h3>FIELD KIT</h3><span>Filter your adventure</span></div><button class="text-button" data-action="clear">Reset</button></div>
            <div class="filters">${filterRow("fur", "Fur colour", "compass", "All")}${filterRow("behaviour", "Behaviour", "compass", "Any")}${filterRow("shift", "Time of day", "sun", "All")}${filterRow("date", "Census date", "calendar", "All dates")}</div>
            <p class="filter-help">Each choice narrows your search.<span data-search-active hidden> Observation list search is also active.</span></p>
            <div class="matching" aria-live="polite"><span class="counter-squirrel">${squirrelArt}</span><div><span class="matching-number">—</span><p>squirrels detected</p></div><span class="count-note" data-count-message></span></div>
            <p class="empty-state" data-empty hidden>No squirrels detected. Suspicious. Try another filter or reset your field kit.</p>
            <button class="acorn-progress" data-view="missions"><span class="progress-icon">${acorn}</span><span class="acorn-content"><span>Acorn progress</span><span class="acorn-collection" data-acorns aria-hidden="true"></span></span><span class="progress-caption"><strong data-progress-label>0 of 5</strong><small>Field discoveries</small></span>${icon("arrow")}</button>
            <div class="mission-teaser"><span class="teaser-acorn">${icon("book")}</span><div><p>Today’s discovery</p><h3>A little curiosity goes a long way.</h3><p>New squirrels. New stories. Same beautiful park.</p><button class="text-button" data-view="missions">See your missions →</button></div></div>
          </section>
          <section data-pane="observation" hidden><button class="text-button back" data-view="filters">← Back to exploring</button><div class="observation-hero"><div data-portrait class="portrait" aria-label="Illustrative squirrel portrait">🐿</div><span class="specimen-tag">FIELD OBSERVATION</span></div><div data-card></div><div class="card-actions"><button data-action="share" class="primary">${icon("share")} Copy sighting link</button><button data-action="fly" class="secondary">${icon("compass")} Find in park</button></div><div data-share-fallback hidden><label>Copy this link<input readonly name="share-link" /></label></div><button class="surprise secondary" data-action="surprise">${icon("shuffle")} Another little discovery</button></section>
          <section data-pane="missions" hidden><p class="eyebrow">COLLECT A LITTLE CURIOSITY</p><h2>Your discovery trail</h2><p>Select real observations to earn five acorn badges. A single sighting can unlock more than one.</p><div class="mission-progress"><span class="mission-count">0/5</span><progress max="5" value="0" aria-label="Discovery missions completed"></progress></div><div data-missions></div><button class="surprise primary" data-action="surprise">${icon("shuffle")} Take me somewhere</button></section>
          <section data-pane="notebook" hidden><p class="eyebrow">LITTLE MOMENTS, KEPT CLOSE</p><h2>Your field notebook</h2><p>Every observation you select is tucked away here, in this browser only.</p><div data-notebook></div><button class="text-button reset-progress" data-action="reset-progress">Reset discoveries & mission progress</button></section>
          <section data-pane="list" hidden><p class="eyebrow">A DIFFERENT WAY TO EXPLORE</p><h2>Observation index</h2><p>The same real sightings, with no 3D required. Your filters apply here too.</p><label class="search-label">Search ID, coat, age or notes<input name="query" type="search" placeholder="Try “peanut” or an observation ID" /></label><div class="list-summary"><span data-list-count></span><button class="text-button" data-view="filters">Edit filters</button><button class="text-button" data-action="clear">Clear all</button></div><div data-list></div><div class="pagination"><button class="secondary" data-action="previous">← Previous</button><span data-page></span><button class="secondary" data-action="next">Next →</button></div></section>

          <section data-pane="notes" hidden><p class="eyebrow">FROM THE FIELD</p><h2>A small park expedition.</h2><p class="notes-intro">In October 2018, volunteers took to Central Park with a simple question: what are the squirrels up to?</p><div class="field-note-entry"><span>01 / THE SIGHTINGS</span><h3>Real squirrels. Real field notes.</h3><p>Explore the original census observations, including coats, behaviour, dates, and the occasional wonderfully specific observer note. Open any sighting to read what was recorded.</p></div><div class="field-note-entry"><span>02 / THE IMAGINATION</span><h3>A name for every little character.</h3><p>Field nicknames are generated from observation IDs. They are playful aliases, not names assigned by census volunteers. Portraits and the park’s scenery are illustrative.</p></div><div class="field-note-entry"><span>03 / YOUR EXPEDITION</span><h3>Leave with a little curiosity.</h3><p>Select sightings to save them in your notebook and collect five discovery acorns. Your notebook stays in this browser.</p></div><button class="primary surprise" data-view="list">${icon("notes")} Read the observations ${icon("arrow")}</button></section>
          <footer class="field-footer"><span class="footer-leaf">✳</span><p><strong>Real sightings. A little imagination.</strong><br>2018 census observations, not live locations or a count of distinct animals. Trees, water, paths & squirrel scale are illustrative.</p><details><summary>Sources & field notes</summary><p>Sightings: <a href="https://data.cityofnewyork.us/Environment/2018-Central-Park-Squirrel-Census-Squirrel-Data/vfnx-vebw" target="_blank" rel="noreferrer">The Squirrel Census / NYC Open Data</a>. Park outline: <a href="https://data.cityofnewyork.us/Recreation/Functional-Parkland/xhvt-s4va" target="_blank" rel="noreferrer">NYC Parks, Functional Parkland</a>.</p><p data-provenance></p><p>Positions retain relative geographic spacing. Models are enlarged for legibility. This is an autumn diorama, not a surveyed map. Discoveries stay on this device; clearing browser storage removes them.</p></details><address class="creator-contact"><span>Made by Morten Teinum</span><a href="mailto:morten@teinum.no">morten@teinum.no</a></address><button type="button" class="text-button analytics-settings" data-analytics-settings hidden>Privacy settings</button></footer>
        </div></div>
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
  const title = element("h2", "", nickname(o));
  title.tabIndex = -1;
  host.append(
    title,
    element(
      "p",
      "fine-print",
      "A playful field nickname · " + squirrelActivity(o).note,
    ),
  );
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
    ["Location", o.location ? label(o.location) : "Not recorded"],
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
    element("strong", "", nickname(o)),
    element("span", "row-id", o.observationId),
    element(
      "small",
      "",
      `${o.fur ?? "Unknown coat"} · ${dateLabel(o.date)} · ${o.shift ?? "Unknown shift"}${o.id !== o.observationId ? ` · record ${o.id.split("~").at(-1)}` : ""}`,
    ),
  );
  button.append(dot, content, element("span", "row-arrow", "↗"));
  return button;
}

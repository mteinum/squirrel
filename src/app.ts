import {
  behaviourKeys,
  type Snapshot,
  type ParkData,
  type Observation,
} from "./data/types";
import {
  SafariState,
  emptyFilters,
  readDiscoveries,
  saveDiscoveries,
  missions,
  matches,
} from "./state";
import {
  shell,
  element,
  label,
  renderCard,
  observationButton,
  acorn,
  dateLabel,
} from "./ui";
import { nickname, squirrelActivity, countMessage } from "./field-guide";
import type { SafariScene } from "./scene/scene";
import { createCelebration } from "./celebration";
export interface MountOptions {
  assetBase?: string;
  disableWebGL?: boolean;
}
/** Mount one independent experience. Call the returned cleanup before removing its host. */
export function mountSquirrelSafari(
  host: HTMLElement,
  options: MountOptions = {},
): () => void {
  host.innerHTML = shell();
  const abort = new AbortController(),
    signal = abort.signal;
  let disposed = false,
    scene: SafariScene | null = null,
    state: SafariState | null = null;
  let page = 0,
    toastTimer = 0,
    radarTimer = 0,
    visionTimer = 0,
    vision = false,
    matchesCache: Observation[] = [];
  const pageSize = 20;
  const get = <T extends HTMLElement>(selector: string) =>
    host.querySelector<T>(selector)!;
  const all = <T extends HTMLElement>(selector: string) =>
    host.querySelectorAll<T>(selector);
  const status = get(".map-status"),
    toast = get(".toast");
  const perkNote = get<HTMLDialogElement>(".perk-note");
  perkNote.addEventListener(
    "close",
    () => {
      const sign = get<HTMLButtonElement>(".perk-sign");
      sign.setAttribute("aria-expanded", "false");
      if (!sign.hidden) sign.focus({ preventScroll: true });
      else
        get<HTMLButtonElement>('[data-action="reset-view"]').focus({
          preventScroll: true,
        });
    },
    { signal },
  );
  const celebration = createCelebration(get(".park"));
  const base = options.assetBase ?? import.meta.env.BASE_URL;
  const assetUrl = (name: string) =>
    new URL(
      `${base.endsWith("/") ? base : base + "/"}data/${name}`,
      document.baseURI,
    ).href;
  function notify(message: string) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 6500);
  }
  function setView(next: string, focus = false) {
    if (next === "observation" && !state?.selected) return;
    all<HTMLElement>("[data-pane]").forEach((pane) => {
      pane.hidden = pane.dataset.pane !== next;
    });
    all<HTMLButtonElement>(".panel-tabs button").forEach((button) => {
      const active =
        button.dataset.view === next ||
        (button.dataset.view === "filters" &&
          ["list", "observation"].includes(next));
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    get(".panel-scroll").scrollTop = 0;
    if (matchMedia("(max-width: 760px)").matches) setSheet(true);
    if (focus) {
      const title = get<HTMLElement>(`[data-pane="${next}"] h2`);
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
  }
  function setSheet(expanded: boolean) {
    get(".panel").classList.toggle("expanded", expanded);
    get('[data-action="sheet"]').setAttribute(
      "aria-expanded",
      String(expanded),
    );
    get("[data-sheet-label]").textContent = expanded
      ? "Close field kit"
      : "Open field kit";
    get(".notebook-content").inert =
      matchMedia("(max-width: 760px)").matches && !expanded;
    get(".park").inert = matchMedia("(max-width: 760px)").matches && expanded;
  }
  const mobileQuery = matchMedia("(max-width: 760px)");
  mobileQuery.addEventListener(
    "change",
    () => setSheet(get(".panel").classList.contains("expanded")),
    { signal },
  );
  setSheet(false);

  function syncChips() {
    if (!state) return;
    all<HTMLButtonElement>("[data-filter]").forEach((button) => {
      const name = button.dataset.filter as
        "fur" | "behaviour" | "shift" | "date";
      button.setAttribute(
        "aria-pressed",
        String(state!.filters[name] === button.dataset.value),
      );
    });
    all<HTMLSelectElement>(".filters select").forEach((select) => {
      const value =
        state!.filters[select.name as "fur" | "behaviour" | "shift" | "date"];
      select.value = value;
      const row = select.closest(".filter-row")!;
      const quick = Array.from(
        row.querySelectorAll<HTMLElement>("[data-value]"),
      ).some((button) => button.dataset.value === value);
      const summary = row.querySelector("summary")!;
      summary.classList.toggle("selected", !quick);
      summary.textContent = quick
        ? "+"
        : `✓ ${select.selectedOptions[0]?.textContent ?? value}`;
    });
  }
  function buildChips() {
    const choices: Record<string, string[]> = {
      fur: ["", "Gray", "Cinnamon", "Black"],
      behaviour: ["", "eating", "running", "climbing"],
      shift: ["", "AM", "PM"],
      date: [
        "",
        ...Array.from(get<HTMLSelectElement>('select[name="date"]').options)
          .slice(1, 3)
          .map((option) => option.value),
      ],
    };
    Object.entries(choices).forEach(([name, values]) => {
      const chips = get(`[data-chips="${name}"]`);
      chips.replaceChildren();
      const select = get<HTMLSelectElement>(`select[name="${name}"]`);
      values
        .filter((value) =>
          Array.from(select.options).some((option) => option.value === value),
        )
        .forEach((value) => {
          const text = value
            ? name === "date"
              ? dateLabel(value).replace(", 2018", "")
              : label(value)
            : name === "date"
              ? "All dates"
              : name === "behaviour"
                ? "Any"
                : "All";
          const button = element("button", "filter-chip", text);
          button.type = "button";
          button.dataset.filter = name;
          button.dataset.value = value;
          button.setAttribute("aria-pressed", "false");
          chips.append(button);
        });
    });
    syncChips();
  }
  function showFeatured(observation: Observation) {
    const activity = squirrelActivity(observation);
    get(".featured-squirrel").hidden = false;
    get(".park").classList.add("has-selection");
    get("[data-nickname]").textContent = nickname(observation);
    get("[data-featured-note]").textContent = activity.note;
    get(".featured-illustration").setAttribute(
      "data-fur",
      observation.fur ?? "Unknown",
    );
    const facts = get("[data-featured-facts]");
    facts.replaceChildren();
    [
      ["Fur colour", observation.fur ?? "Unknown"],
      ["Behaviour", activity.label],
      [
        "Spotted",
        observation.location ? label(observation.location) : "Not recorded",
      ],
    ].forEach(([name, value]) => {
      const group = element("div");
      group.append(element("dt", "", name), element("dd", "", value));
      facts.append(group);
    });
    if (state && !matches(observation, state.filters))
      facts.append(
        element("p", "featured-filtered", "Outside your current filters"),
      );
  }
  function persist() {
    if (!state) return;
    try {
      if (!saveDiscoveries(localStorage, [...state.discovered]))
        notify(
          "Storage is unavailable. Discoveries will last for this visit only.",
        );
    } catch {
      notify(
        "Storage is unavailable. Discoveries will last for this visit only.",
      );
    }
  }
  function updateProgress() {
    if (!state) return;
    const complete = state.completed;
    all(".mission-count").forEach((node) => {
      node.textContent = `${complete.size}/5`;
    });
    all(".notebook-count").forEach((node) => {
      node.textContent = String(state!.discovered.size);
    });
    get<HTMLProgressElement>("progress").value = complete.size;
    get("[data-progress-label]").textContent = `${complete.size} of 5`;
    const acorns = get("[data-acorns]");
    acorns.replaceChildren();
    missions.forEach((mission) => {
      const badge = element(
        "span",
        complete.has(mission.id) ? "collected" : "",
      );
      badge.innerHTML = acorn;
      acorns.append(badge);
    });
    const missionHost = get("[data-missions]");
    missionHost.replaceChildren();
    missions.forEach((mission, i) => {
      const row = element(
        "div",
        `mission-row ${complete.has(mission.id) ? "complete" : ""}`,
      );
      const badge = element("span", "acorn-badge");
      badge.innerHTML = acorn;
      badge.setAttribute("aria-hidden", "true");
      const content = element("div");
      content.append(
        element(
          "small",
          "",
          `DISCOVERY 0${i + 1}${complete.has(mission.id) ? " · FOUND" : ""}`,
        ),
        element("h3", "", mission.title),
        element("p", "", mission.detail),
      );
      row.append(badge, content);
      missionHost.append(row);
    });
    const notebook = get("[data-notebook]");
    notebook.replaceChildren();
    if (!state.discovered.size)
      notebook.append(
        element(
          "div",
          "notebook-empty",
          "A fresh page, a whole park ahead. Select a sighting on the map or in the observation index to begin.",
        ),
      );
    else
      [...state.discovered].reverse().forEach((id) => {
        const o = state!.byId.get(id);
        if (o) notebook.append(observationButton(o));
      });
    get<HTMLButtonElement>('[data-action="reset-progress"]').disabled =
      state.discovered.size === 0;
  }
  function renderList() {
    const maxPage = Math.max(0, Math.ceil(matchesCache.length / pageSize) - 1);
    page = Math.min(page, maxPage);
    const list = get("[data-list]");
    list.replaceChildren();
    matchesCache
      .slice(page * pageSize, (page + 1) * pageSize)
      .forEach((o) => list.append(observationButton(o)));
    if (!matchesCache.length)
      list.append(
        element(
          "p",
          "empty-state",
          "No observations found. Try a different search or clear your filters.",
        ),
      );
    get("[data-list-count]").textContent =
      `${matchesCache.length.toLocaleString()} matches`;
    get("[data-page]").textContent = `${page + 1} / ${maxPage + 1}`;
    get<HTMLButtonElement>('[data-action="previous"]').disabled = page === 0;
    get<HTMLButtonElement>('[data-action="next"]').disabled = page === maxPage;
  }
  function updateMatches() {
    if (!state) return;
    matchesCache = state.matching;
    scene?.setObservations(matchesCache);
    get(".matching-number").textContent = matchesCache.length.toLocaleString();
    get("[data-mobile-count]").textContent =
      matchesCache.length.toLocaleString();
    get("[data-count-message]").textContent = countMessage(matchesCache.length);
    get("[data-vision-count]").textContent =
      `${matchesCache.length.toLocaleString()} potential targets detected`;
    get("[data-search-active]").hidden = !state.filters.query;
    syncChips();
    get("[data-empty]").hidden = matchesCache.length > 0;
    all<HTMLButtonElement>('[data-action="surprise"]').forEach((b) => {
      b.disabled = !matchesCache.length;
    });
    renderList();
    if (state.selected) {
      renderCard(
        get("[data-card]"),
        state.selected,
        !matches(state.selected, state.filters),
      );
      if (!get(".featured-squirrel").hidden) showFeatured(state.selected);
    }
  }
  function select(
    id: string,
    fly = true,
    changeUrl = true,
    focus = true,
    details = true,
  ) {
    if (!state) return;
    const before = state.completed;
    const observation = state.select(id);
    if (!observation) {
      notify(
        "That observation link could not be found. You can still explore the full census.",
      );
      return;
    }
    persist();
    updateProgress();
    renderCard(
      get("[data-card]"),
      observation,
      !matches(observation, state.filters),
    );
    showFeatured(observation);
    if (details) setView("observation", focus);
    else if (focus)
      get<HTMLButtonElement>(".featured-details").focus({
        preventScroll: true,
      });
    scene?.select(observation, fly);
    if (changeUrl) {
      const url = new URL(location.href);
      url.searchParams.set("squirrel", id);
      history.replaceState(null, "", url);
    }
    const complete = state.completed;
    const earned = missions.filter(
      (mission) => complete.has(mission.id) && !before.has(mission.id),
    );
    if (earned.length) {
      celebration.show(earned, complete);
      notify(
        `${complete.size === missions.length ? "All five acorns collected!" : earned.length === 1 ? "Acorn collected!" : `${earned.length} acorns collected!`} ${earned.map((mission) => mission.title).join("; ")}. ${complete.size} of ${missions.length} discoveries complete.`,
      );
    }
  }
  function readLink() {
    const id = new URL(location.href).searchParams.get("squirrel");
    if (id) select(id, true, false, false);
  }
  function clear() {
    if (!state) return;
    state.filters = emptyFilters();
    page = 0;
    all<HTMLSelectElement | HTMLInputElement>(
      '.filters select, input[name="query"]',
    ).forEach((input) => {
      input.value = "";
    });
    updateMatches();
    notify("All filters and search cleared.");
  }
  function webglFailure() {
    scene?.dispose();
    scene = null;
    status.hidden = false;
    status.textContent =
      "The 3D park is unavailable. Explore every sighting in the observation index.";
    get(".park").classList.add("scene-unavailable");
    all<HTMLButtonElement>('.map-tools button, [data-action="fly"]').forEach(
      (b) => {
        b.disabled = true;
      },
    );
    setView("list");
  }
  async function share() {
    if (!state?.selected) return;
    const url = new URL(location.href);
    url.searchParams.set("squirrel", state.selected.id);
    try {
      await navigator.clipboard.writeText(url.href);
      if (!disposed)
        notify("Sighting link copied. A little discovery worth sharing.");
    } catch {
      if (disposed) return;
      get("[data-share-fallback]").hidden = false;
      const input = get<HTMLInputElement>('[name="share-link"]');
      input.value = url.href;
      input.focus();
      input.select();
      notify(
        "Copying is unavailable. Select and copy the link below the share button.",
      );
    }
  }
  host.addEventListener(
    "click",
    (event) => {
      const target = (event.target as Element).closest<HTMLButtonElement>(
        "button",
      );
      if (!target || target.disabled) return;
      if (target.dataset.view) {
        setView(target.dataset.view, true);
        return;
      }
      if (target.dataset.observation) {
        select(target.dataset.observation);
        return;
      }
      if (target.dataset.filter && state) {
        state.filters[
          target.dataset.filter as "fur" | "behaviour" | "shift" | "date"
        ] = target.dataset.value ?? "";
        page = 0;
        updateMatches();
        return;
      }
      switch (target.dataset.action) {
        case "central-perk":
          target.setAttribute("aria-expanded", "true");
          perkNote.showModal();
          break;
        case "sheet":
          setSheet(!get(".panel").classList.contains("expanded"));
          break;
        case "close-featured":
          get(".featured-squirrel").hidden = true;
          get(".park").classList.remove("has-selection");
          get<HTMLButtonElement>('[data-action="vision"]').focus({
            preventScroll: true,
          });
          break;
        case "vision":
          vision = !vision;
          target.setAttribute("aria-pressed", String(vision));
          get(".park").classList.toggle("squirrel-vision", vision);
          scene?.setVision(vision);
          get(".vision-message").hidden = !vision;
          clearTimeout(visionTimer);
          if (vision)
            visionTimer = window.setTimeout(() => {
              get(".vision-message").hidden = true;
            }, 3500);
          break;
        case "reset-view":
          scene?.reset();
          break;
        case "top":
          scene?.topDown();
          break;
        case "zoom-in":
          scene?.zoom(0.72);
          break;
        case "zoom-out":
          scene?.zoom(1.4);
          break;
        case "fly":
          if (state?.selected) scene?.select(state.selected, true);
          break;
        case "clear":
          clear();
          break;
        case "surprise": {
          if (matchesCache.length) {
            select(
              matchesCache[Math.floor(Math.random() * matchesCache.length)].id,
              true,
              true,
              false,
              mobileQuery.matches &&
                get(".panel").classList.contains("expanded"),
            );
            clearTimeout(radarTimer);
            const travelling =
              scene && !matchMedia("(prefers-reduced-motion: reduce)").matches;
            get("[data-radar]").textContent = travelling
              ? "Deploying squirrel radar…"
              : "Squirrel located. Field trip successful.";
            get(".radar-status").classList.toggle(
              "searching",
              Boolean(travelling),
            );
            if (travelling)
              radarTimer = window.setTimeout(() => {
                get("[data-radar]").textContent =
                  "Squirrel located. Field trip successful.";
                get(".radar-status").classList.remove("searching");
              }, 650);
          }
          break;
        }
        case "share":
          void share();
          break;
        case "previous":
          page--;
          renderList();
          get(".panel-scroll").scrollTop = 0;
          break;
        case "next":
          page++;
          renderList();
          get(".panel-scroll").scrollTop = 0;
          break;
        case "reset-progress":
          celebration.clear();
          state?.discovered.clear();
          persist();
          updateProgress();
          notify(
            "Your notebook is a fresh page. All discoveries and acorns have been reset.",
          );
          break;
        case "retry":
          void load();
          break;
      }
    },
    { signal },
  );
  host.addEventListener(
    "change",
    (event) => {
      const target = event.target as HTMLSelectElement;
      if (
        !state ||
        !["fur", "behaviour", "date", "shift"].includes(target.name)
      )
        return;
      state.filters[target.name as "fur" | "behaviour" | "date" | "shift"] =
        target.value;
      page = 0;
      updateMatches();
      const more = target.closest("details");
      if (more) {
        more.open = false;
        more.querySelector("summary")?.focus({ preventScroll: true });
      }
      notify(
        `${matchesCache.length.toLocaleString()} observations match your filters.`,
      );
    },
    { signal },
  );
  host.addEventListener(
    "input",
    (event) => {
      const target = event.target as HTMLInputElement;
      if (target.name === "query" && state) {
        state.filters.query = target.value;
        page = 0;
        updateMatches();
      }
    },
    { signal },
  );
  window.addEventListener("popstate", readLink, { signal });
  async function load() {
    status.hidden = false;
    status.textContent = "Asking the squirrels where they are…";
    all<HTMLButtonElement>('[data-action="surprise"]').forEach((b) => {
      b.disabled = true;
    });
    try {
      const response = await fetch(assetUrl("census.json"), { signal });
      if (!response.ok)
        throw new Error(`Census snapshot HTTP ${response.status}`);
      const snapshot = (await response.json()) as Snapshot;
      if (
        snapshot.schemaVersion !== 1 ||
        !Array.isArray(snapshot.observations) ||
        !snapshot.observations.length ||
        snapshot.observations.some(
          (o) =>
            !o.id ||
            !o.behaviours ||
            !Array.isArray(o.notes) ||
            !Number.isFinite(o.longitude) ||
            !Number.isFinite(o.latitude),
        )
      )
        throw new Error("Invalid census snapshot");
      if (disposed) return;
      const validIds = new Set(snapshot.observations.map((o) => o.id));
      let restored: string[] = [];
      try {
        const saved = readDiscoveries(localStorage, validIds);
        restored = saved.ids;
        if (saved.unavailable)
          notify(
            "Local storage could not be read. Starting a fresh notebook for this visit.",
          );
      } catch {
        notify(
          "Storage is unavailable. Your notebook will last for this visit only.",
        );
      }
      state = new SafariState(snapshot.observations, restored);
      function fillOptions(
        name: string,
        values: string[],
        formatter = (v: string) => v,
      ) {
        const select = get<HTMLSelectElement>(`select[name="${name}"]`);
        while (select.options.length > 1) select.remove(1);
        values.forEach((value) =>
          select.add(new Option(formatter(value), value)),
        );
      }
      fillOptions(
        "fur",
        [
          ...new Set(snapshot.observations.map((o) => o.fur ?? "Unknown")),
        ].sort(),
      );
      fillOptions(
        "date",
        [
          ...new Set(snapshot.observations.map((o) => o.date ?? "Unknown")),
        ].sort(),
        dateLabel,
      );
      fillOptions("behaviour", [...behaviourKeys], label);
      buildChips();
      const legend = get(".legend");
      legend.replaceChildren();
      [...new Set(snapshot.observations.map((o) => o.fur ?? "Unknown"))]
        .sort()
        .forEach((fur) => {
          const item = element("span");
          const dot = element("i", `fur-dot ${fur.toLowerCase()}`);
          dot.setAttribute("aria-hidden", "true");
          item.append(dot, document.createTextNode(fur));
          legend.append(item);
        });
      get("[data-provenance]").textContent =
        `Snapshot retrieved ${snapshot.metadata.retrievedAt.slice(0, 10)}. ${snapshot.metadata.count.toLocaleString()} observations; ${snapshot.metadata.rejectedCoordinates} invalid coordinates rejected. Repeated source IDs are retained with distinct share links.`;
      updateMatches();
      updateProgress();
      status.hidden = true;
      if (options.disableWebGL) webglFailure();
      else {
        try {
          const [parkResponse, sceneModule] = await Promise.all([
            fetch(assetUrl("park.json"), { signal }),
            import("./scene/scene"),
          ]);
          if (!parkResponse.ok) throw new Error("Park snapshot unavailable");
          const park = (await parkResponse.json()) as ParkData;
          if (!park.geometry?.coordinates?.length)
            throw new Error("Invalid park geometry");
          if (disposed) return;
          scene = sceneModule.createScene(
            get("[data-scene]"),
            park,
            (id) => select(id, false, true, true, false),
            webglFailure,
            get("[data-portrait]"),
          );
          scene.setObservations(matchesCache);
          scene.setVision(vision);
          if (state.selected) scene.select(state.selected, true);
        } catch (error) {
          if (disposed) return;
          console.warn("3D park unavailable:", error);
          webglFailure();
        }
      }
      readLink();
    } catch (error) {
      if (disposed) return;
      status.replaceChildren(
        element(
          "p",
          "",
          "The local census snapshot could not be loaded. Please retry.",
        ),
      );
      const retry = element("button", "primary", "Retry loading");
      retry.dataset.action = "retry";
      status.append(retry);
      status.hidden = false;
      notify(
        "Census data unavailable. Check the local snapshot and try again.",
      );
      console.warn("Snapshot load failed:", error);
    }
  }
  void load();
  return () => {
    disposed = true;
    abort.abort();
    clearTimeout(toastTimer);
    clearTimeout(radarTimer);
    clearTimeout(visionTimer);
    celebration.dispose();
    scene?.dispose();
    scene = null;
    host.replaceChildren();
  };
}

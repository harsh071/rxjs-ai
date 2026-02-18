import { createStore } from "rxjs-ai";

interface AppState {
  count: number;
  theme: "light" | "dark";
  username: string;
}

function $(selector: string) {
  return document.querySelector(selector);
}

export function setup() {
  const store = createStore<AppState>({
    count: 0,
    theme: "light",
    username: "Guest",
  });

  // ── Selectors ──
  const count$ = store.select((s) => s.count);
  const theme$ = store.select((s) => s.theme);
  const username$ = store.select((s) => s.username);

  // ── Bind UI ──
  count$.subscribe((count) => {
    const el = $("#counter-value");
    if (el) el.textContent = String(count);
  });

  theme$.subscribe((theme) => {
    const el = $("#theme-value");
    if (el) {
      el.textContent = theme;
      el.className = `theme-badge ${theme}`;
    }
  });

  username$.subscribe((name) => {
    const el = $("#username-value");
    if (el) el.textContent = name;
  });

  // Full state log
  store.state$.subscribe((state) => {
    const el = $("#store-state-log");
    if (el) el.textContent = JSON.stringify(state, null, 2);
  });

  // ── Buttons ──
  $("#btn-increment")?.addEventListener("click", () => {
    store.patchState((s) => ({ count: s.count + 1 }));
  });

  $("#btn-decrement")?.addEventListener("click", () => {
    store.patchState((s) => ({ count: s.count - 1 }));
  });

  $("#btn-reset")?.addEventListener("click", () => {
    store.patchState({ count: 0 });
  });

  $("#btn-toggle-theme")?.addEventListener("click", () => {
    store.patchState((s) => ({
      theme: s.theme === "light" ? "dark" : "light",
    }));
  });

  $("#btn-set-username")?.addEventListener("click", () => {
    const input = $("#username-input") as HTMLInputElement;
    const name = input.value.trim();
    if (name) {
      store.patchState({ username: name });
      input.value = "";
    }
  });

  // Enter key for username
  ($("#username-input") as HTMLInputElement)?.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        $("#btn-set-username")?.dispatchEvent(new Event("click"));
      }
    }
  );
}

import { createCommandBus } from "rxjs-ai";

// ── Command type definitions ──
type AppCommands = {
  userLoggedIn: { username: string };
  itemAdded: { itemName: string; quantity: number };
  itemRemoved: { itemId: number };
  themeChanged: { theme: "light" | "dark" };
};

function $(selector: string) {
  return document.querySelector(selector);
}

// Counters for mock data
let itemCounter = 0;
const mockUsernames = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"];
let usernameIndex = 0;

export function setup() {
  const bus = createCommandBus<AppCommands>();
  const activeFilters = new Set([
    "userLoggedIn",
    "itemAdded",
    "itemRemoved",
    "themeChanged",
  ]);
  let currentTheme: "light" | "dark" = "light";

  const logContainer = $("#commands-log")!;

  function appendLogEntry(
    type: string,
    payload: unknown,
    source: string
  ) {
    // Remove empty placeholder
    const empty = logContainer.querySelector(".log-empty");
    if (empty) empty.remove();

    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.innerHTML = `
      <span class="log-type ${type}">${type}</span>
      <span class="log-payload">${JSON.stringify(payload)}</span>
      <span class="log-source">${source}</span>
    `;

    logContainer.prepend(entry);

    // Cap at 50 entries
    while (logContainer.children.length > 50) {
      logContainer.lastChild?.remove();
    }
  }

  // ── ofType subscriptions — controlled by filter checkboxes ──
  bus.ofType("userLoggedIn").subscribe((envelope) => {
    if (activeFilters.has("userLoggedIn")) {
      appendLogEntry("userLoggedIn", envelope.payload, "ofType");
    }
  });

  bus.ofType("itemAdded").subscribe((envelope) => {
    if (activeFilters.has("itemAdded")) {
      appendLogEntry("itemAdded", envelope.payload, "ofType");
    }
  });

  bus.ofType("itemRemoved").subscribe((envelope) => {
    if (activeFilters.has("itemRemoved")) {
      appendLogEntry("itemRemoved", envelope.payload, "ofType");
    }
  });

  bus.ofType("themeChanged").subscribe((envelope) => {
    if (activeFilters.has("themeChanged")) {
      appendLogEntry("themeChanged", envelope.payload, "ofType");
    }
  });

  // ── Dispatch buttons ──
  document.querySelectorAll("[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = (btn as HTMLElement).dataset.cmd as keyof AppCommands;

      switch (cmd) {
        case "userLoggedIn":
          bus.dispatch("userLoggedIn", {
            username: mockUsernames[usernameIndex++ % mockUsernames.length],
          });
          break;
        case "itemAdded":
          itemCounter++;
          bus.dispatch("itemAdded", {
            itemName: `Item #${itemCounter}`,
            quantity: Math.floor(Math.random() * 10) + 1,
          });
          break;
        case "itemRemoved":
          bus.dispatch("itemRemoved", {
            itemId: Math.floor(Math.random() * itemCounter) + 1,
          });
          break;
        case "themeChanged":
          currentTheme = currentTheme === "light" ? "dark" : "light";
          bus.dispatch("themeChanged", { theme: currentTheme });
          break;
      }
    });
  });

  // ── Filter toggles ──
  document
    .querySelectorAll(".filter-toggles input[type=checkbox]")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const input = e.target as HTMLInputElement;
        if (input.checked) {
          activeFilters.add(input.value);
        } else {
          activeFilters.delete(input.value);
        }
      });
    });

  // ── Clear log ──
  $("#btn-clear-log")!.addEventListener("click", () => {
    logContainer.innerHTML = `<div class="log-empty">Dispatch a command to see events</div>`;
  });
}

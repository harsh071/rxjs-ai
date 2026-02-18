import { Observable, delay, of } from "rxjs";
import { createAsyncController, type AsyncStatus } from "rxjs-ai";

// ── Mock data ──
const LANGUAGES = [
  { name: "TypeScript", description: "Typed superset of JavaScript", year: 2012 },
  { name: "JavaScript", description: "The language of the web", year: 1995 },
  { name: "Python", description: "General-purpose, high-level language", year: 1991 },
  { name: "Rust", description: "Systems programming with safety guarantees", year: 2010 },
  { name: "Go", description: "Simple, fast, compiled language by Google", year: 2009 },
  { name: "Swift", description: "Modern language for Apple platforms", year: 2014 },
  { name: "Kotlin", description: "Modern JVM language by JetBrains", year: 2011 },
  { name: "Java", description: "Write once, run anywhere", year: 1995 },
  { name: "C#", description: "Modern OOP language by Microsoft", year: 2000 },
  { name: "Ruby", description: "Optimized for programmer happiness", year: 1995 },
  { name: "Elixir", description: "Functional language on the Erlang VM", year: 2011 },
  { name: "Haskell", description: "Purely functional programming", year: 1990 },
  { name: "Scala", description: "Functional and OOP on the JVM", year: 2004 },
  { name: "Clojure", description: "Modern Lisp for the JVM", year: 2007 },
  { name: "Dart", description: "Client-optimized language by Google", year: 2011 },
  { name: "Zig", description: "Low-level programming without hidden control flow", year: 2016 },
  { name: "OCaml", description: "Functional language with type inference", year: 1996 },
  { name: "F#", description: "Functional-first language for .NET", year: 2005 },
  { name: "Lua", description: "Lightweight embeddable scripting language", year: 1993 },
  { name: "R", description: "Statistical computing and graphics", year: 1993 },
];

interface SearchResult {
  name: string;
  description: string;
  year: number;
}

function $(selector: string) {
  return document.querySelector(selector);
}

export function setup() {
  // Create the async controller with a simulated search executor
  const searchController = createAsyncController<string, SearchResult[]>(
    (query: string) => {
      const results = LANGUAGES.filter(
        (lang) =>
          lang.name.toLowerCase().includes(query.toLowerCase()) ||
          lang.description.toLowerCase().includes(query.toLowerCase())
      );

      // Simulate network delay (300-800ms)
      const fakeDelay = 300 + Math.random() * 500;
      return of(results).pipe(delay(fakeDelay));
    }
  );

  // ── Bind state to UI ──
  searchController.state$.subscribe((state) => {
    // Update status
    const statusText = $("#async-status-text")!;
    const statusDot = $(".async-status .status-indicator")!;
    statusText.textContent = state.status;
    statusDot.className = `status-indicator ${state.status}`;

    // Update cancel button
    const cancelBtn = $("#btn-async-cancel") as HTMLButtonElement;
    cancelBtn.disabled = state.status !== "loading";

    // Update results
    const container = $("#async-results")!;

    if (state.status === "loading") {
      container.innerHTML = `<div class="async-empty">Searching...</div>`;
      return;
    }

    if (state.status === "error") {
      container.innerHTML = `<div class="async-empty" style="color: var(--error)">Error: ${state.error}</div>`;
      return;
    }

    if (!state.data || state.data.length === 0) {
      if (state.status === "success") {
        container.innerHTML = `<div class="async-empty">No results found</div>`;
      } else if (state.status === "cancelled") {
        container.innerHTML = `<div class="async-empty">Search cancelled</div>`;
      } else {
        container.innerHTML = `<div class="async-empty">Start typing to search</div>`;
      }
      return;
    }

    container.innerHTML = state.data
      .map(
        (lang) => `
        <div class="async-result-item">
          <div>
            <div class="result-name">${lang.name}</div>
            <div class="result-description">${lang.description}</div>
          </div>
          <span class="result-year">${lang.year}</span>
        </div>
      `
      )
      .join("");
  });

  // ── Input handling ──
  let debounceTimer: ReturnType<typeof setTimeout>;
  const searchInput = $("#async-search-input") as HTMLInputElement;

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = searchInput.value.trim();

    if (!query) {
      searchController.cancel();
      return;
    }

    // Debounce 250ms, then execute — previous request auto-cancels via switchMap
    debounceTimer = setTimeout(() => {
      searchController.execute(query);
    }, 250);
  });

  // Cancel button
  $("#btn-async-cancel")!.addEventListener("click", () => {
    searchController.cancel();
  });
}

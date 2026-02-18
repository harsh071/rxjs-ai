import { Observable, of, delay } from "rxjs";
import {
  generateText,
  type LanguageModel,
  type TextResult,
  type Message,
} from "rxjs-ai";

// ── Mock LanguageModel with doGenerate ──
function createMockLanguageModel(): LanguageModel {
  const responses: Record<string, string> = {
    hello:
      "Hello! I'm a mock AI model powered by rxjs-ai's generateText() function. Unlike streamText(), I return a single complete TextResult with the full response text, token usage, and finish reason — all wrapped in an Observable.",
    generate:
      "generateText() is the non-streaming counterpart to streamText(). It calls model.doGenerate() and returns an Observable<TextResult>. This is ideal for background tasks, data extraction, or any use case where you don't need to display partial results.",
    observable:
      "Even though generateText() returns a complete response, it's still an Observable — meaning you get cancellation via AbortSignal, error handling with catchError, and composition with other streams using operators like switchMap, merge, and retry.",
    compare:
      "streamText() returns a StreamTextResult with delta$, text$, and stream$ observables for real-time streaming. generateText() returns Observable<TextResult> with the full response at once. Use streamText() for UI display, generateText() for background processing.",
  };

  return {
    modelId: "mock:generate-text",
    doGenerate: ({ messages }) => {
      const lastUser = messages.filter((m) => m.role === "user").at(-1);
      const userText =
        lastUser?.content
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") ?? "";

      const reply =
        Object.entries(responses).find(([key]) =>
          userText.toLowerCase().includes(key)
        )?.[1] ??
        `You said: "${userText}". This is a complete, non-streaming response from generateText(). The entire result arrives at once as a TextResult object containing text, usage stats, and the finish reason.`;

      const words = reply.split(" ");
      const result: TextResult = {
        text: reply,
        usage: {
          promptTokens: words.length * 2,
          completionTokens: words.length,
          totalTokens: words.length * 3,
        },
        finishReason: "stop",
        messages: [
          ...(lastUser ? [lastUser] : []),
          { role: "assistant", content: [{ type: "text", text: reply }] },
        ],
      };

      // Simulate network latency (200-600ms)
      const fakeDelay = 200 + Math.random() * 400;
      return of(result).pipe(delay(fakeDelay));
    },
    doStream: () => {
      throw new Error("Use doGenerate for this demo");
    },
  };
}

// ── DOM helpers ──
function $(selector: string) {
  return document.querySelector(selector);
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ── Setup ──
let activeAbortController: AbortController | null = null;

export function setup() {
  const model = createMockLanguageModel();

  const form = $("#generate-text-form") as HTMLFormElement;
  const input = $("#generate-text-input") as HTMLInputElement;
  const cancelBtn = $("#btn-generate-cancel") as HTMLButtonElement;
  const clearBtn = $("#btn-generate-clear") as HTMLButtonElement;
  const resultOutput = $("#generate-result-output") as HTMLElement;
  const usageOutput = $("#generate-usage-output") as HTMLElement;
  const historyOutput = $("#generate-history-output") as HTMLElement;
  const statusEl = $("#generate-status-text") as HTMLElement;
  const statusDot = $(".generate-status-bar .status-indicator") as HTMLElement;

  let history: { prompt: string; result: TextResult }[] = [];

  function setStatus(status: string) {
    statusEl.textContent = status;
    statusDot.className = `status-indicator ${status}`;
    cancelBtn.disabled = status !== "loading";
  }

  function renderHistory() {
    if (history.length === 0) {
      historyOutput.innerHTML = `<span class="text-muted">Previous results will appear here...</span>`;
      return;
    }

    historyOutput.innerHTML = history
      .map(
        (entry, i) => `
        <div class="generate-history-item">
          <div class="generate-history-prompt">${escapeHtml(entry.prompt)}</div>
          <div class="generate-history-response">${escapeHtml(entry.result.text)}</div>
          <div class="generate-history-meta">
            ${entry.result.finishReason} · ${entry.result.usage.totalTokens} tokens
          </div>
        </div>
      `
      )
      .reverse()
      .join("");
  }

  function runGenerate(prompt: string) {
    if (activeAbortController) {
      activeAbortController.abort();
    }

    const abortController = new AbortController();
    activeAbortController = abortController;

    resultOutput.innerHTML = `<span class="text-muted">Waiting for response...</span>`;
    usageOutput.innerHTML = `<span class="text-muted">-</span>`;
    setStatus("loading");

    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: prompt }] },
    ];

    const start = performance.now();

    generateText({
      model,
      messages,
      signal: abortController.signal,
    }).subscribe({
      next: (result) => {
        const elapsed = Math.round(performance.now() - start);

        resultOutput.innerHTML = `<div class="generate-result-text">${escapeHtml(result.text)}</div>`;
        usageOutput.innerHTML = `
          <div class="generate-usage-grid">
            <div class="generate-usage-item">
              <span class="generate-usage-label">Prompt tokens</span>
              <span class="generate-usage-value">${result.usage.promptTokens}</span>
            </div>
            <div class="generate-usage-item">
              <span class="generate-usage-label">Completion tokens</span>
              <span class="generate-usage-value">${result.usage.completionTokens}</span>
            </div>
            <div class="generate-usage-item">
              <span class="generate-usage-label">Total tokens</span>
              <span class="generate-usage-value">${result.usage.totalTokens}</span>
            </div>
            <div class="generate-usage-item">
              <span class="generate-usage-label">Finish reason</span>
              <span class="generate-usage-value">${result.finishReason}</span>
            </div>
            <div class="generate-usage-item">
              <span class="generate-usage-label">Latency</span>
              <span class="generate-usage-value">${elapsed}ms</span>
            </div>
          </div>
        `;

        history.push({ prompt, result });
        renderHistory();
        setStatus("success");
      },
      error: (err) => {
        if (err?.name === "AbortError") {
          resultOutput.innerHTML = `<span class="text-muted">Request cancelled</span>`;
          setStatus("cancelled");
        } else {
          resultOutput.innerHTML = `<div style="color: var(--error)">Error: ${escapeHtml(String(err))}</div>`;
          setStatus("error");
        }
      },
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    runGenerate(text);
  });

  cancelBtn.addEventListener("click", () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
      setStatus("cancelled");
    }
  });

  clearBtn.addEventListener("click", () => {
    resultOutput.innerHTML = `<span class="text-muted">Result will appear here...</span>`;
    usageOutput.innerHTML = `<span class="text-muted">-</span>`;
    history = [];
    renderHistory();
    setStatus("idle");
  });

  setStatus("idle");
}

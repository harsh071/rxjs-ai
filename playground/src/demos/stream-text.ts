import { Observable } from "rxjs";
import {
  streamText,
  type LanguageModel,
  type TextStreamEvent,
  type Message,
} from "rxjs-ai";

// ── Mock LanguageModel ──
function createMockLanguageModel(): LanguageModel {
  const responses: Record<string, string> = {
    hello:
      "Hello! I'm a mock AI model powered by rxjs-ai's new streamText() function. Each word arrives as a text-delta event through an Observable stream.",
    stream:
      "streamText() returns a StreamTextResult with three observables: stream$ for raw events, delta$ for individual text deltas, and text$ for accumulated text. All share a single upstream subscription via share().",
    observable:
      "Observables are the foundation of rxjs-ai. Unlike promises, they support streaming, cancellation, and composition with operators like race(), merge(), switchMap(), and retry().",
    cancel:
      "Cancellation is built into streamText() via AbortSignal. Pass a signal option and abort it to immediately stop the stream. The subscriber receives an AbortError.",
  };

  return {
    modelId: "mock:playground",
    doGenerate: () => {
      throw new Error("Use doStream for this demo");
    },
    doStream: ({ messages }) => {
      const lastUser = messages
        .filter((m) => m.role === "user")
        .at(-1);
      const userText =
        lastUser?.content
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") ?? "";

      const reply =
        Object.entries(responses).find(([key]) =>
          userText.toLowerCase().includes(key),
        )?.[1] ??
        `You said: "${userText}". This response is streamed word-by-word via streamText(), demonstrating rxjs-ai's LanguageModel interface and Observable-based streaming pipeline.`;

      const words = reply.split(" ");

      return new Observable<TextStreamEvent>((subscriber) => {
        let index = 0;
        const id = setInterval(() => {
          if (index < words.length) {
            subscriber.next({
              type: "text-delta",
              textDelta: (index === 0 ? "" : " ") + words[index]!,
            });
            index++;
          } else {
            subscriber.next({
              type: "finish",
              text: reply,
              usage: { promptTokens: words.length * 2, completionTokens: words.length, totalTokens: words.length * 3 },
              finishReason: "stop",
            });
            subscriber.complete();
            clearInterval(id);
          }
        }, 50);

        return () => clearInterval(id);
      });
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

  const form = $("#stream-text-form") as HTMLFormElement;
  const input = $("#stream-text-input") as HTMLInputElement;
  const cancelBtn = $("#btn-stream-cancel") as HTMLButtonElement;
  const clearBtn = $("#btn-stream-clear") as HTMLButtonElement;
  const deltaOutput = $("#stream-delta-output") as HTMLElement;
  const textOutput = $("#stream-text-output") as HTMLElement;
  const eventsOutput = $("#stream-events-output") as HTMLElement;
  const statusEl = $("#stream-status-text") as HTMLElement;
  const statusDot = $(".stream-status-bar .status-indicator") as HTMLElement;

  function setStatus(status: string) {
    statusEl.textContent = status;
    statusDot.className = `status-indicator ${status}`;
    cancelBtn.disabled = status !== "streaming";
  }

  function runStream(prompt: string) {
    // Abort any active stream
    if (activeAbortController) {
      activeAbortController.abort();
    }

    const abortController = new AbortController();
    activeAbortController = abortController;

    deltaOutput.innerHTML = "";
    textOutput.innerHTML = "";
    eventsOutput.innerHTML = "";
    setStatus("streaming");

    const messages: Message[] = [
      { role: "user", content: [{ type: "text", text: prompt }] },
    ];

    const result = streamText({
      model,
      messages,
      signal: abortController.signal,
      onFinish: (finalResult) => {
        eventsOutput.innerHTML += `<div class="event-entry finish">finish: ${finalResult.finishReason} (${finalResult.usage.totalTokens} tokens)</div>`;
      },
    });

    let deltaIndex = 0;
    let textIndex = 0;

    // Subscribe to delta$ — each emission is just the new piece
    result.delta$.subscribe({
      next: (delta) => {
        deltaOutput.innerHTML += `<div class="emission-row"><span class="emission-index">#${deltaIndex}</span><span class="emission-value">${escapeHtml(delta)}</span></div>`;
        deltaOutput.scrollTop = deltaOutput.scrollHeight;
        eventsOutput.innerHTML += `<div class="event-entry delta">text-delta: "${escapeHtml(delta)}"</div>`;
        eventsOutput.scrollTop = eventsOutput.scrollHeight;
        deltaIndex++;
      },
      error: (err) => {
        setStatus("error");
        eventsOutput.innerHTML += `<div class="event-entry error">error: ${escapeHtml(String(err))}</div>`;
      },
    });

    // Subscribe to text$ — each emission is the FULL accumulated string so far
    result.text$.subscribe({
      next: (accumulated) => {
        textOutput.innerHTML += `<div class="emission-row"><span class="emission-index">#${textIndex}</span><span class="emission-value">${escapeHtml(accumulated)}</span></div>`;
        textOutput.scrollTop = textOutput.scrollHeight;
        textIndex++;
      },
      complete: () => {
        setStatus("idle");
      },
      error: () => {
        setStatus("error");
      },
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    runStream(text);
  });

  cancelBtn.addEventListener("click", () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
      setStatus("cancelled");
    }
  });

  clearBtn.addEventListener("click", () => {
    deltaOutput.innerHTML = `<span class="text-muted">Individual deltas will appear here...</span>`;
    textOutput.innerHTML = `<span class="text-muted">Accumulated text will appear here...</span>`;
    eventsOutput.innerHTML = `<span class="text-muted">Stream events will appear here...</span>`;
    setStatus("idle");
  });

  // Initial state
  setStatus("idle");
}

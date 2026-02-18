import { Observable } from "rxjs";
import {
  createChatController,
  type ChatModelAdapter,
  type ChatChunk,
  type ChatMessage,
  type ChatStatus,
} from "rxjs-ai";

// ── Mock streaming model ──
function createMockAdapter(): ChatModelAdapter {
  const responses: Record<string, string> = {
    hello:
      "Hello! I'm a mock AI model running inside rxjs-ai. I stream my responses word-by-word using RxJS Observables. Pretty cool, right?",
    help: "I can help you explore rxjs-ai! Try asking me about Observables, streaming, or anything else. Each response is streamed as individual chunks through an Observable pipeline.",
    rxjs: "RxJS is a library for reactive programming using Observables. It makes it easy to compose asynchronous or callback-based code. rxjs-ai builds on top of RxJS to provide AI-native primitives like chat controllers, async state management, and more.",
    stream:
      "Streaming is at the heart of rxjs-ai. Every AI response is delivered as an Observable stream of chunks. This means you can use operators like throttleTime, retry, race, and takeUntil to compose powerful patterns with minimal code.",
    cancel:
      "You can cancel any in-flight request by calling chat.cancel(). The partial response is preserved in the message history. Try sending a message and clicking the Cancel button while it streams!",
    retry:
      "The retryLast() method regenerates the last assistant response. This is useful when the model errors or you want a different answer. Try it after a completed response!",
  };

  return {
    complete({ messages }) {
      const lastUser = messages.filter((m) => m.role === "user").at(-1);
      const userText = lastUser?.content.toLowerCase() ?? "";

      const reply =
        Object.entries(responses).find(([key]) =>
          userText.includes(key)
        )?.[1] ??
        `You said: "${lastUser?.content}". This is a simulated streaming response from the mock model. Each word arrives as a separate Observable emission, demonstrating the power of rxjs-ai's stream-first architecture.`;

      const words = reply.split(" ");

      return new Observable<ChatChunk>((subscriber) => {
        let index = 0;
        const id = setInterval(() => {
          if (index < words.length) {
            subscriber.next({
              content: (index === 0 ? "" : " ") + words[index],
              done: index === words.length - 1,
            });
            index++;
          } else {
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

function renderMessages(messages: ChatMessage[], isStreaming: boolean) {
  const container = $("#chat-messages")!;

  if (messages.length === 0) {
    container.innerHTML = `<div class="chat-empty">Send a message to start chatting</div>`;
    return;
  }

  container.innerHTML = messages
    .map((msg) => {
      const isLastAssistant =
        msg.role === "assistant" && msg === messages.at(-1);
      const cursorHtml =
        isLastAssistant && isStreaming ? `<span class="cursor"></span>` : "";
      const content = msg.content || (isLastAssistant && isStreaming ? "" : "...");
      return `<div class="chat-message ${msg.role}">${escapeHtml(content)}${cursorHtml}</div>`;
    })
    .join("");

  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function updateStatus(status: ChatStatus) {
  const textEl = $("#chat-status-text")!;
  const dotEl = $(".chat-status-bar .status-indicator")!;

  textEl.textContent = status;
  dotEl.className = `status-indicator ${status}`;

  const cancelBtn = $("#btn-cancel") as HTMLButtonElement;
  const retryBtn = $("#btn-retry") as HTMLButtonElement;
  const sendBtn = $("#chat-form button[type=submit]") as HTMLButtonElement;
  const input = $("#chat-input") as HTMLInputElement;

  const busy = status === "loading" || status === "streaming";
  cancelBtn.disabled = !busy;
  retryBtn.disabled = busy || status === "idle";
  sendBtn.disabled = busy;
  input.disabled = busy;
}

// ── Setup (supports re-init for clear) ──
let activeChat: ReturnType<typeof createChatController> | null = null;

export function setup() {
  if (activeChat) {
    activeChat.destroy();
  }

  const adapter = createMockAdapter();
  activeChat = createChatController(adapter);
  const chat = activeChat;

  let currentStatus: ChatStatus = "idle";

  chat.status$.subscribe((status) => {
    currentStatus = status;
    updateStatus(status);
  });

  chat.messages$.subscribe((messages) => {
    const isStreaming =
      currentStatus === "streaming" || currentStatus === "loading";
    renderMessages(messages, isStreaming);
  });

  // Clone form to remove old event listeners on re-init
  const form = $("#chat-form") as HTMLFormElement;
  const newForm = form.cloneNode(true) as HTMLFormElement;
  form.parentNode!.replaceChild(newForm, form);
  const input = newForm.querySelector("#chat-input") as HTMLInputElement;

  newForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    chat.send(text);
  });

  // Clone buttons to remove old listeners
  for (const id of ["btn-cancel", "btn-retry", "btn-clear"]) {
    const old = document.getElementById(id)!;
    const fresh = old.cloneNode(true) as HTMLElement;
    old.parentNode!.replaceChild(fresh, old);
  }

  document.getElementById("btn-cancel")!.addEventListener("click", () => chat.cancel());
  document.getElementById("btn-retry")!.addEventListener("click", () => chat.retryLast());
  document.getElementById("btn-clear")!.addEventListener("click", () => setup());
}

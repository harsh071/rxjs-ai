import {
  Observable,
  race,
  fromEvent,
  interval,
  map,
  startWith,
  throttleTime,
  asyncScheduler,
} from "rxjs";
import {
  createChatController,
  createViewModel,
  type ChatModelAdapter,
  type ChatChunk,
} from "rxjs-ai";

function $(selector: string) {
  return document.querySelector(selector);
}

// ── Create a streaming model with configurable delay ──
function createDelayedModel(name: string, delayMs: number): ChatModelAdapter {
  return {
    complete({ messages }) {
      const lastUser = messages.filter((m) => m.role === "user").at(-1);
      const reply = `[${name}] Response to "${lastUser?.content ?? ""}": This model has a per-word delay of ${delayMs}ms.`;
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
        }, delayMs);
        return () => clearInterval(id);
      });
    },
  };
}

// ── Race adapter: sends to both, uses first responder ──
function raceAdapters(
  a: ChatModelAdapter,
  b: ChatModelAdapter
): ChatModelAdapter {
  return {
    complete(request) {
      return race(a.complete(request), b.complete(request));
    },
  };
}

export function setup() {
  setupRaceDemo();
  setupViewModelDemo();
}

function setupRaceDemo() {
  const fastDelayInput = $("#race-fast-delay") as HTMLInputElement;
  const slowDelayInput = $("#race-slow-delay") as HTMLInputElement;
  const fastDelayVal = $("#race-fast-delay-val")!;
  const slowDelayVal = $("#race-slow-delay-val")!;

  fastDelayInput.addEventListener("input", () => {
    fastDelayVal.textContent = `${fastDelayInput.value}ms`;
  });

  slowDelayInput.addEventListener("input", () => {
    slowDelayVal.textContent = `${slowDelayInput.value}ms`;
  });

  let activeRaceChat: ReturnType<typeof createChatController> | null = null;

  $("#btn-race")!.addEventListener("click", () => {
    if (activeRaceChat) {
      activeRaceChat.destroy();
      activeRaceChat = null;
    }

    const fastDelay = Number(fastDelayInput.value);
    const slowDelay = Number(slowDelayInput.value);
    const prompt = ($("#race-prompt") as HTMLInputElement).value.trim();
    if (!prompt) return;

    const fastModel = createDelayedModel("Fast", fastDelay);
    const slowModel = createDelayedModel("Slow", slowDelay);

    // Reset UI
    const fastOutput = $("#race-output-fast")!;
    const slowOutput = $("#race-output-slow")!;
    const fastTag = $("#race-tag-fast")!;
    const slowTag = $("#race-tag-slow")!;

    fastOutput.textContent = "...";
    slowOutput.textContent = "...";
    fastTag.textContent = "racing";
    fastTag.className = "race-tag racing";
    slowTag.textContent = "racing";
    slowTag.className = "race-tag racing";

    let winnerDeclared = false;

    // Race the two models via composed adapter
    const racedAdapter = raceAdapters(fastModel, slowModel);
    const racedChat = createChatController(racedAdapter);
    activeRaceChat = racedChat;

    racedChat.messages$.subscribe((msgs) => {
      const last = msgs.at(-1);
      if (last?.role === "assistant" && last.content) {
        // Determine winner by checking which model's prefix appears
        if (last.content.includes("[Fast]")) {
          fastOutput.textContent = last.content;
          if (!winnerDeclared) {
            winnerDeclared = true;
            fastTag.textContent = "winner";
            fastTag.className = "race-tag winner";
            slowTag.textContent = "cancelled";
            slowTag.className = "race-tag loser";
            slowOutput.textContent = "(cancelled)";
          }
        } else if (last.content.includes("[Slow]")) {
          slowOutput.textContent = last.content;
          if (!winnerDeclared) {
            winnerDeclared = true;
            slowTag.textContent = "winner";
            slowTag.className = "race-tag winner";
            fastTag.textContent = "cancelled";
            fastTag.className = "race-tag loser";
            fastOutput.textContent = "(cancelled)";
          }
        }
      }
    });

    racedChat.send(prompt);
  });
}

function setupViewModelDemo() {
  // Source 1: Mouse position (throttled)
  const mouse$ = fromEvent<MouseEvent>(document, "mousemove").pipe(
    throttleTime(50, asyncScheduler, { leading: true, trailing: true }),
    map((e) => ({ x: e.clientX, y: e.clientY })),
    startWith({ x: 0, y: 0 })
  );

  // Source 2: Window width
  const width$ = fromEvent(window, "resize").pipe(
    throttleTime(100, asyncScheduler, { leading: true, trailing: true }),
    map(() => window.innerWidth),
    startWith(window.innerWidth)
  );

  // Source 3: Timer
  const time$ = interval(1000).pipe(
    map(() => new Date().toLocaleTimeString()),
    startWith(new Date().toLocaleTimeString())
  );

  // ── createViewModel ──
  const vm$ = createViewModel(
    { mouse: mouse$, width: width$, time: time$ },
    ({ mouse, width, time }) => ({
      mousePosition: `${mouse.x}, ${mouse.y}`,
      screenSize: width > 1200 ? "large" : width > 768 ? "medium" : "small",
      windowWidth: width,
      currentTime: time,
      isWideScreen: width > 1024,
    }),
    // Custom comparator: update on every change
    () => false
  );

  vm$.subscribe((vm) => {
    const mouseEl = $("#vm-mouse");
    const widthEl = $("#vm-width");
    const timeEl = $("#vm-time");
    const outputEl = $("#vm-output");

    if (mouseEl) mouseEl.textContent = `x: ${vm.mousePosition.split(", ")[0]}, y: ${vm.mousePosition.split(", ")[1]}`;
    if (widthEl) widthEl.textContent = `${vm.windowWidth}px (${vm.screenSize})`;
    if (timeEl) timeEl.textContent = vm.currentTime;
    if (outputEl) outputEl.textContent = JSON.stringify(vm, null, 2);
  });
}

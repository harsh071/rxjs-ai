# rxjs-ai

A stream-first AI SDK built on [RxJS](https://github.com/ReactiveX/rxjs). Framework-agnostic primitives for building AI-native applications with reactive streams.

> Think of it as the [Vercel AI SDK](https://ai-sdk.dev) — but Observable-native, composable, and zero framework lock-in.

[![npm version](https://img.shields.io/npm/v/rxjs-ai.svg)](https://www.npmjs.com/package/rxjs-ai)
[![license](https://img.shields.io/npm/l/rxjs-ai.svg)](https://github.com/harsh071/rxjs-ai/blob/main/LICENSE)

**[Playground](https://rxjs-ai-playground.vercel.app/)** — try it live in the browser.

## Why rxjs-ai?

Modern AI apps are streaming by nature — tokens arrive one at a time, tool calls fire in parallel, models race against each other, and users cancel mid-stream. RxJS was built for exactly this, but teams reinvent the same patterns every time.

`rxjs-ai` turns those patterns into reusable, type-safe primitives.

### What makes it different

| | Vercel AI SDK | rxjs-ai |
|---|---|---|
| **Streaming model** | AsyncIterable | Observable — compose with 100+ RxJS operators |
| **Cancellation** | AbortController ceremony | `unsubscribe()` — one call |
| **Retry** | Manual | `retry(3)`, `retryWhen(...)` — built into the stream |
| **Throttle UI updates** | `experimental_throttle` | `throttleTime(50)` — standard operator |
| **Race models** | Not supported | `race(modelA$, modelB$)` — native |
| **Reactive primitives** | Bring your own | Built-in `createStore`, `createCommandBus` |
| **Framework** | React-first | Framework-agnostic core |

## Install

```bash
npm install rxjs-ai rxjs
```

## Quick Start

```ts
import { of } from "rxjs";
import { createChatController } from "rxjs-ai";

// 1. Define a model adapter (plug in any LLM)
const model = {
  complete: ({ messages }) => {
    const last = messages[messages.length - 1];
    return of(`Echo: ${last?.content ?? ""}`);
  },
};

// 2. Create the controller
const chat = createChatController(model);

// 3. React to state changes
chat.status$.subscribe((status) => console.log("Status:", status));
chat.messages$.subscribe((msgs) => console.log("Messages:", msgs.length));

// 4. Send a message
chat.send("Hello, AI!");
```

## API Reference

### Core

#### `createStore<State>(initialState)`

Reactive state container with selectors and distinct emission.

```ts
import { createStore } from "rxjs-ai";

const store = createStore({ count: 0, query: "" });

// Full state stream
store.state$.subscribe((state) => console.log(state));

// Derived selector — only emits when count changes
store.select((s) => s.count).subscribe((count) => console.log(count));

// Update state
store.patchState({ count: 1 });
store.setState((prev) => ({ ...prev, count: prev.count + 1 }));

// Synchronous read
console.log(store.getState().count);

// Cleanup
store.destroy();
```

| Property / Method | Type | Description |
|---|---|---|
| `state$` | `Observable<State>` | Full state stream |
| `getState()` | `() => State` | Synchronous snapshot |
| `setState(updater)` | `(State \| (prev) => State) => void` | Replace full state |
| `patchState(patch)` | `(Partial<State> \| (prev) => Partial<State>) => void` | Merge partial update |
| `select(selector, compare?)` | `(fn, eq?) => Observable<T>` | Derived stream with distinct filtering |
| `destroy()` | `() => void` | Complete all subjects |

---

#### `createCommandBus<Commands>()`

Type-safe event bus for decoupled command routing.

```ts
import { createCommandBus } from "rxjs-ai";

type AppCommands = {
  "search/submit": { query: string };
  "search/clear": undefined;
  "chat/send": { content: string };
};

const bus = createCommandBus<AppCommands>();

// Listen to specific commands
bus.ofType("search/submit").subscribe((cmd) => {
  console.log("Search:", cmd.payload.query); // fully typed
});

// Dispatch
bus.dispatch("search/submit", { query: "rxjs streams" });

// All commands stream
bus.commands$.subscribe((cmd) => console.log(cmd.type, cmd.timestamp));
```

| Property / Method | Type | Description |
|---|---|---|
| `commands$` | `Observable<CommandEnvelope>` | All commands stream |
| `dispatch(type, payload)` | typed by `Commands` | Send a command |
| `ofType(...types)` | `(...types) => Observable<CommandEnvelope>` | Filter by command type |
| `destroy()` | `() => void` | Complete the bus |

---

#### `createAsyncController<Req, Data, Err>(executor)`

Manages async request lifecycle with status tracking and cancellation.

```ts
import { createAsyncController } from "rxjs-ai";
import { from } from "rxjs";

const search = createAsyncController<string, string[]>((query, signal) =>
  from(fetch(`/api/search?q=${query}`, { signal }).then((r) => r.json())),
);

// React to status changes
search.state$.subscribe(({ status, data, error }) => {
  console.log(status); // "idle" | "loading" | "success" | "error" | "cancelled"
});

// Execute (auto-cancels previous in-flight request)
search.execute("rxjs");
search.execute("rxjs ai"); // previous request aborted via switchMap

// Manual cancel
search.cancel();
```

| Property / Method | Type | Description |
|---|---|---|
| `state$` | `Observable<AsyncState<Data, Err>>` | Status + data + error stream |
| `execute(request)` | `(Req) => void` | Trigger request (cancels previous) |
| `cancel()` | `() => void` | Abort current request |
| `destroy()` | `() => void` | Teardown |

---

### AI

#### `streamText(options)`

Streams text from a `LanguageModel`. Returns `stream$` (raw events), `text$` (accumulated text), and `delta$` (individual chunks).

```ts
import { streamText } from "rxjs-ai";

const result = streamText({
  model,
  messages: [{ role: "user", content: [{ type: "text", text: "Explain RxJS." }] }],
});

// Accumulated text — updates as tokens arrive
result.text$.subscribe((text) => console.log(text));

// Individual deltas
result.delta$.subscribe((chunk) => process.stdout.write(chunk));

// Raw stream events (text-delta, finish, error)
result.stream$.subscribe((event) => console.log(event.type));
```

| Property | Type | Description |
|---|---|---|
| `stream$` | `Observable<TextStreamEvent>` | Raw stream events |
| `text$` | `Observable<string>` | Accumulated text |
| `delta$` | `Observable<string>` | Individual text deltas |

---

#### `generateText(options)`

Non-streaming text generation. Returns a single `TextResult` with text, token usage, and finish reason.

```ts
import { generateText } from "rxjs-ai";

generateText({
  model,
  messages: [{ role: "user", content: [{ type: "text", text: "What is 2 + 2?" }] }],
}).subscribe((result) => {
  console.log(result.text);          // "4"
  console.log(result.usage);         // { promptTokens, completionTokens, totalTokens }
  console.log(result.finishReason);  // "stop"
});
```

---

#### `createChatController(model, options?)`

Manages a full chat session — message history, streaming, retry, and cancellation. Accepts either a `LanguageModel` or a `ChatModelAdapter`.

```ts
import { of } from "rxjs";
import { createChatController } from "rxjs-ai";

const chat = createChatController({
  complete: ({ messages }) => {
    const last = messages[messages.length - 1];
    return of(`Echo: ${last?.content ?? ""}`);
  },
});

// Observe individual streams
chat.messages$.subscribe((msgs) => { /* message list updates */ });
chat.status$.subscribe((s) => { /* "idle" | "loading" | "streaming" | "error" | "cancelled" */ });

// Or combined state
chat.state$.subscribe(({ messages, status, error }) => { /* full snapshot */ });

// Send — creates user + assistant messages, streams response
chat.send("Explain RxJS in one sentence.");

// Retry last request
chat.retryLast();

// Cancel in-flight response
chat.cancel();

// Cleanup
chat.destroy();
```

| Property / Method | Type | Description |
|---|---|---|
| `messages$` | `Observable<ChatMessage[]>` | Message list stream |
| `status$` | `Observable<ChatStatus>` | Status stream |
| `error$` | `Observable<unknown>` | Error stream |
| `state$` | `Observable<ChatState>` | Combined state stream |
| `getState()` | `() => ChatState` | Synchronous snapshot |
| `send(content, meta?)` | `(string, Record?) => void` | Send user message |
| `retryLast()` | `() => void` | Retry last completion |
| `cancel()` | `() => void` | Abort in-flight request |
| `destroy()` | `() => void` | Teardown all subscriptions |

---

### UI

#### `createViewModel(sources, projector, compare?)`

Combines multiple Observable sources into a single projected view model.

```ts
import { createStore, createViewModel } from "rxjs-ai";

const store = createStore({ query: "", loading: false, results: [] as string[] });

const vm$ = createViewModel(
  {
    query: store.select((s) => s.query),
    loading: store.select((s) => s.loading),
    count: store.select((s) => s.results.length),
  },
  ({ query, loading, count }) => ({
    heading: query ? `Results for "${query}"` : "Search",
    showSpinner: loading,
    badge: `${count} items`,
  }),
);

vm$.subscribe((vm) => console.log(vm.heading, vm.badge));
```

---

## The RxJS Advantage

Every primitive returns standard Observables — the full power of RxJS operators works out of the box:

```ts
import { retry, timeout, takeUntil, throttleTime, race, merge } from "rxjs";

// Retry with timeout
chat.state$.pipe(timeout(30_000), retry(3));

// Throttle UI updates
chat.messages$.pipe(throttleTime(50));

// Cancel on user navigation
chat.messages$.pipe(takeUntil(routeChange$));

// Combine stores
merge(storeA.select((s) => s.value), storeB.select((s) => s.value));
```

## Types

All types are exported from the main entry point:

```ts
import type {
  // Core
  Store, StateUpdater, StatePatch,
  CommandBus, CommandMap, CommandEnvelope,
  AsyncController, AsyncState, AsyncStatus,
  // AI — LanguageModel
  LanguageModel, LanguageModelRequest, Message, MessagePart,
  TextStreamEvent, TextDeltaEvent, FinishEvent, TextResult, TokenUsage, FinishReason,
  StreamTextOptions, StreamTextResult, GenerateTextOptions,
  // AI — Chat
  ChatController, ChatModelAdapter, ChatModelRequest,
  ChatMessage, ChatState, ChatStatus, ChatRole, ChatChunk,
} from "rxjs-ai";
```

## Requirements

- **RxJS** `>=7.8.0` (peer dependency)
- **TypeScript** `>=5.0` (recommended)

## Development

```bash
npm install
npm run typecheck
npm run build
npm run test
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development plan with atomic tasks.

## License

[MIT](LICENSE)

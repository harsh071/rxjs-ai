# RxJS AI

`rxjs-ai` is a layer on top of [RxJS](https://github.com/ReactiveX/rxjs) for building AI-native applications with reactive streams.

The goal is to give developers a clean architecture for:

- stream-first state management,
- typed command/event flows,
- async request orchestration,
- AI chat/completion control with cancellation and retries,
- UI view model projection with minimal framework lock-in.

## Why this exists

Modern AI apps are mostly async workflows and continuously changing state. RxJS is ideal for this, but teams usually reinvent the same patterns for chat, request status, cancellation, and UI binding. `rxjs-ai` turns those patterns into reusable primitives.

## Install

```bash
npm install rxjs-ai rxjs
```

If you want the React hook:

```bash
npm install react
```

## API surface (v0.1)

- `createStore` for app state and selectors
- `createCommandBus` for typed app commands/events
- `createAsyncController` for request status + cancellation
- `createChatController` for AI chat flows
- `createViewModel` for UI-oriented stream projection
- `useObservableValue` from `rxjs-ai/react` for React binding

## Quick start

```ts
import { createChatController } from "rxjs-ai";
import { Observable } from "rxjs";

const model = {
  complete: ({ messages }: { messages: Array<{ content: string }>; signal: AbortSignal }) =>
    new Observable<string>((subscriber) => {
      const lastUser = messages[messages.length - 1];
      subscriber.next(`Echo: ${lastUser?.content ?? ""}`);
      subscriber.complete();
    }),
};

const chat = createChatController(model);

chat.state$.subscribe((state) => {
  console.log(state.status, state.messages);
});

chat.send("Build me a stream pipeline for search.");
```

## State + UI example

```ts
import { createStore, createViewModel } from "rxjs-ai";

type AppState = {
  query: string;
  loading: boolean;
  results: string[];
};

const store = createStore<AppState>({
  query: "",
  loading: false,
  results: [],
});

const viewModel$ = createViewModel(
  {
    query: store.select((state) => state.query),
    loading: store.select((state) => state.loading),
    resultCount: store.select((state) => state.results.length),
  },
  ({ query, loading, resultCount }) => ({
    heading: query.length > 0 ? `Results for "${query}"` : "Search",
    showSpinner: loading,
    resultCountLabel: `${resultCount} items`,
  }),
);
```

## Roadmap

1. Framework adapters for Vue/Solid/Svelte.
2. Multi-model routing and fallback policies.
3. Tool-calling workflows for agent loops.
4. Devtools timeline for stream + command tracing.
5. First-party recipes for chat, RAG, and streaming UI.

## Development

```bash
npm install
npm run typecheck
npm run build
```

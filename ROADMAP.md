# rxjs-ai Roadmap

This document tracks every feature, improvement, and task planned for `rxjs-ai` — organized into phases with atomic, shippable tasks. Each task produces a testable unit of work and a corresponding documentation page or example on the docs website.

Status key: `[ ]` planned | `[~]` in progress | `[x]` done

---

## Phase 0 — Ship What Exists (v0.1)

Get the current code published and documented. No new features — just make what exists professional and discoverable.

### NPM & Repo Hygiene

- [x] `0.1` — Write comprehensive README with API reference, examples, comparison table
- [x] `0.2` — Add `repository`, `homepage`, `bugs` fields to package.json
- [x] `0.3` — Add `author` field and finalize `keywords` for NPM discoverability
- [x] `0.4` — Add `.npmignore` or verify `files` field excludes test/demo/config
- [x] `0.5` — Add `engines` field (Node >=18) to package.json
- [x] `0.6` — Verify `npm pack` output is clean — no test files, no demo.ts, no tsconfig

### CI & Quality

- [x] `0.7` — Add GitHub Actions workflow: typecheck + test on push/PR
- [x] `0.8` — Add GitHub Actions workflow: publish to NPM on tag/release
- [x] `0.9` — Add CONTRIBUTING.md with dev setup, testing, and PR guidelines
- [x] `0.10` — Add `vitest.config.ts` with coverage reporting
- [x] `0.11` — Reach 90%+ test coverage for existing code (99.4% statements, 97.1% branches, 100% functions)

### Documentation Website

- [x] `0.12` — Scaffold docs site with Starlight (Astro) in `docs/` directory
- [x] `0.13` — Create landing page with value prop, install command, and quick start
- [x] `0.14` — Create "Getting Started" guide page
- [x] `0.15` — Create API reference pages for each existing primitive (createStore, createCommandBus, createAsyncController, createChatController, createViewModel)
- [x] `0.16` — Create interactive example: basic chat with mock model
- [ ] `0.17` — Deploy docs site (Vercel / Netlify / GitHub Pages)

---

## Phase 1 — Core AI Primitives (v0.2)

Add the foundational `streamText` and `generateText` functions that make this a real AI SDK — not just a chat controller. This is what makes `rxjs-ai` comparable to the Vercel AI SDK.

### LanguageModel Interface

- [ ] `1.1` — Define `LanguageModel` interface with `doGenerate()` and `doStream()` methods
- [ ] `1.2` — Define `LanguageModelRequest` type (messages, system, temperature, maxTokens, etc.)
- [ ] `1.3` — Define `TextStreamEvent` union type (`text-delta`, `finish`, `error`)
- [ ] `1.4` — Define `TextResult` type (text, usage, finishReason)
- [ ] `1.5` — Define `Message` type with parts model (text, tool-call, tool-result) — richer than current `ChatMessage`
- [ ] `1.6` — Write tests for all type contracts

### streamText()

- [ ] `1.7` — Implement `streamText(options)` returning `Observable<TextStreamEvent>`
- [ ] `1.8` — Add `.text$` helper — accumulated text as `Observable<string>`
- [ ] `1.9` — Add `.delta$` helper — text deltas only as `Observable<string>`
- [ ] `1.10` — Add `onFinish` callback option
- [ ] `1.11` — Support `AbortSignal` passthrough for external cancellation
- [ ] `1.12` — Write unit tests for streamText (happy path, error, cancellation)
- [ ] `1.13` — Docs page: "Streaming Text" with code examples
- [ ] `1.14` — Interactive example: streaming text with live token output

### generateText()

- [ ] `1.15` — Implement `generateText(options)` returning `Observable<TextResult>`
- [ ] `1.16` — Support same options as streamText (messages, system, temperature, etc.)
- [ ] `1.17` — Write unit tests for generateText
- [ ] `1.18` — Docs page: "Generating Text" with code examples

### Refactor createChatController

- [ ] `1.19` — Refactor `createChatController` to use `streamText()` internally
- [ ] `1.20` — Support passing `LanguageModel` instead of raw `ChatModelAdapter`
- [ ] `1.21` — Maintain backwards compatibility with existing `ChatModelAdapter` interface
- [ ] `1.22` — Update tests to verify both adapter paths work

---

## Phase 2 — Provider Packages (v0.3)

Real LLM provider implementations. Users should be able to `npm install @rxjs-ai/openai` and start streaming.

### Provider Architecture

- [ ] `2.1` — Define `Provider` factory pattern: `openai(modelId, config?) → LanguageModel`
- [ ] `2.2` — Create shared HTTP streaming utilities (SSE parsing, fetch with Observable)
- [ ] `2.3` — Create `@rxjs-ai/provider-utils` package with shared helpers

### OpenAI Provider

- [ ] `2.4` — Create `@rxjs-ai/openai` package scaffold
- [ ] `2.5` — Implement `openai(modelId)` — returns LanguageModel
- [ ] `2.6` — Implement `doStream()` — SSE streaming from OpenAI chat completions API
- [ ] `2.7` — Implement `doGenerate()` — non-streaming completion
- [ ] `2.8` — Support model options (temperature, maxTokens, topP, stop, etc.)
- [ ] `2.9` — Write integration tests with mock server
- [ ] `2.10` — Docs page: "OpenAI Provider" with setup guide

### Anthropic Provider

- [ ] `2.11` — Create `@rxjs-ai/anthropic` package scaffold
- [ ] `2.12` — Implement `anthropic(modelId)` — returns LanguageModel
- [ ] `2.13` — Implement streaming via Anthropic messages API
- [ ] `2.14` — Write integration tests with mock server
- [ ] `2.15` — Docs page: "Anthropic Provider" with setup guide

### Google Provider

- [ ] `2.16` — Create `@rxjs-ai/google` package scaffold
- [ ] `2.17` — Implement `google(modelId)` — returns LanguageModel
- [ ] `2.18` — Implement streaming via Google Gemini API
- [ ] `2.19` — Write integration tests with mock server
- [ ] `2.20` — Docs page: "Google Gemini Provider" with setup guide

### Ollama Provider (local models)

- [ ] `2.21` — Create `@rxjs-ai/ollama` package scaffold
- [ ] `2.22` — Implement `ollama(modelId)` for local model access
- [ ] `2.23` — Docs page: "Ollama Provider" — run models locally

---

## Phase 3 — Tool Calling & Agents (v0.4)

This is what separates a toy from a real SDK. Tools let the model call functions, and agent loops let the model reason through multi-step problems.

### Tool Definition

- [ ] `3.1` — Implement `tool()` helper with Zod schema for input validation
- [ ] `3.2` — Define `ToolDefinition` type (description, inputSchema, execute)
- [ ] `3.3` — `execute` function returns `Observable<T>` — supports async/streaming tool results
- [ ] `3.4` — Write unit tests for tool definition and validation
- [ ] `3.5` — Docs page: "Defining Tools"

### Tool Execution in streamText

- [ ] `3.6` — Add `tools` option to `streamText()` / `generateText()`
- [ ] `3.7` — Add `tool-call` and `tool-result` event types to `TextStreamEvent`
- [ ] `3.8` — Auto-execute tools when model requests them
- [ ] `3.9` — Support `toolChoice` option (`auto`, `required`, `none`, specific tool)
- [ ] `3.10` — Write tests for single tool call flow
- [ ] `3.11` — Docs page: "Tool Calling" with weather tool example
- [ ] `3.12` — Interactive example: chat with a tool (e.g., calculator or weather)

### Multi-Step Agent Loop

- [ ] `3.13` — Implement `maxSteps` option for iterative tool → model loops
- [ ] `3.14` — Add `steps` to result — array of intermediate step results
- [ ] `3.15` — Add `onStepFinish` callback for observing each step
- [ ] `3.16` — Use RxJS `expand()` operator internally for the loop
- [ ] `3.17` — Write tests for multi-step agent (tool call → result → tool call → final text)
- [ ] `3.18` — Docs page: "Building Agents" with multi-step example
- [ ] `3.19` — Interactive example: research agent that searches and summarizes

### Tool Calling in createChatController

- [ ] `3.20` — Add `tools` option to `createChatController`
- [ ] `3.21` — Display tool calls and results in the message stream
- [ ] `3.22` — Add `tool-call` and `tool-result` message part types
- [ ] `3.23` — Write tests for chat with tools

---

## Phase 4 — Structured Output (v0.5)

Generate typed objects, not just text. Essential for data extraction, classification, and form-filling use cases.

### generateObject()

- [ ] `4.1` — Implement `generateObject<T>(options)` with Zod schema → `Observable<T>`
- [ ] `4.2` — Support `mode` option: `json` (JSON mode) or `tool` (function calling mode)
- [ ] `4.3` — Validate output against schema, emit typed errors
- [ ] `4.4` — Write unit tests
- [ ] `4.5` — Docs page: "Generating Objects" with recipe extraction example

### streamObject()

- [ ] `4.6` — Implement `streamObject<T>(options)` → `Observable<DeepPartial<T>>`
- [ ] `4.7` — Emit validated partial objects as they build up
- [ ] `4.8` — Add `.fullObject$` helper — emits only the final complete object
- [ ] `4.9` — Write unit tests for partial streaming
- [ ] `4.10` — Docs page: "Streaming Objects"
- [ ] `4.11` — Interactive example: live form filling from natural language

---

## Phase 5 — Middleware & Composition (v0.6)

Cross-cutting concerns — logging, caching, guardrails, RAG injection — without modifying application code.

### Middleware System

- [ ] `5.1` — Define `LanguageModelMiddleware` interface (transformParams, wrapGenerate, wrapStream)
- [ ] `5.2` — Implement `wrapModel(model, middleware)` → wrapped LanguageModel
- [ ] `5.3` — Support chaining multiple middlewares
- [ ] `5.4` — Write unit tests for middleware composition
- [ ] `5.5` — Docs page: "Middleware"

### Built-in Middlewares

- [ ] `5.6` — `loggingMiddleware` — log all requests and responses
- [ ] `5.7` — `cachingMiddleware` — cache identical requests
- [ ] `5.8` — `rateLimitMiddleware` — throttle requests per time window
- [ ] `5.9` — `retryMiddleware` — automatic retry with backoff
- [ ] `5.10` — Docs page: "Built-in Middlewares" with examples for each

### Stream Composition Recipes

- [ ] `5.11` — Recipe: race two models, take fastest
- [ ] `5.12` — Recipe: fallback chain (try model A, if error try model B)
- [ ] `5.13` — Recipe: parallel tool execution with merge
- [ ] `5.14` — Recipe: streaming with debounced UI updates
- [ ] `5.15` — Docs page: "Stream Recipes" — the rxjs-ai cookbook

---

## Phase 6 — Embeddings (v0.7)

Vector embeddings for RAG, semantic search, and similarity.

- [ ] `6.1` — Define `EmbeddingModel` interface
- [ ] `6.2` — Implement `embed(options)` → `Observable<EmbeddingResult>`
- [ ] `6.3` — Implement `embedMany(options)` → `Observable<EmbeddingResult[]>` with batching
- [ ] `6.4` — Implement `cosineSimilarity(a, b)` utility
- [ ] `6.5` — Add embedding support to OpenAI provider
- [ ] `6.6` — Add embedding support to other providers
- [ ] `6.7` — Write tests
- [ ] `6.8` — Docs page: "Embeddings"
- [ ] `6.9` — Interactive example: semantic search over a document set

---

## Phase 7 — Framework Adapters (v0.8)

First-class hooks for React, Vue, Svelte, Angular, and Solid. The core stays framework-agnostic.

### React

- [ ] `7.1` — Create `@rxjs-ai/react` package with `useObservableValue()` and `useChat()` hooks
- [ ] `7.2` — Add `useStreamText()` hook
- [ ] `7.3` — Add `useObject()` hook for streaming structured data
- [ ] `7.4` — Support SSR / React Server Components
- [ ] `7.5` — Docs page: "React Integration" with full example app
- [ ] `7.6` — Interactive example: Next.js chat app

### Vue

- [ ] `7.7` — Create `@rxjs-ai/vue` package
- [ ] `7.8` — Implement `useObservableValue()` composable
- [ ] `7.9` — Implement `useChat()` composable
- [ ] `7.10` — Docs page: "Vue Integration"

### Svelte

- [ ] `7.11` — Create `@rxjs-ai/svelte` package
- [ ] `7.12` — Implement Observable-to-store adapter (Svelte stores are already Observable-like)
- [ ] `7.13` — Implement `useChat()` action/store
- [ ] `7.14` — Docs page: "Svelte Integration"

### Angular

- [ ] `7.15` — Create `@rxjs-ai/angular` package (Angular already uses RxJS natively)
- [ ] `7.16` — Implement `ChatService` injectable
- [ ] `7.17` — Implement `AsyncPipe`-friendly patterns
- [ ] `7.18` — Docs page: "Angular Integration"

---

## Phase 8 — Advanced Features (v0.9+)

### Message Parts Model

- [ ] `8.1` — Refactor `ChatMessage` to support parts: text, image, file, tool-call, tool-result, reasoning
- [ ] `8.2` — Support multimodal input (images, files)
- [ ] `8.3` — Support reasoning tokens display
- [ ] `8.4` — Write migration guide from v0.x flat messages

### MCP (Model Context Protocol)

- [ ] `8.5` — Implement MCP client that exposes tools as `rxjs-ai` tool definitions
- [ ] `8.6` — Dynamic tool discovery
- [ ] `8.7` — Docs page: "MCP Integration"

### DevTools

- [ ] `8.8` — Stream timeline visualization (browser extension or standalone)
- [ ] `8.9` — Command bus inspector
- [ ] `8.10` — Token usage tracking dashboard

### Stream Transforms

- [ ] `8.11` — `smoothStream()` — chunked text smoothing for UI
- [ ] `8.12` — `guardrailStream()` — content filtering mid-stream
- [ ] `8.13` — Custom transform pipeline support

---

## Documentation Website Structure

The docs site (Starlight / Astro) lives in `docs/` and mirrors the phases above:

```
docs/
├── src/
│   └── content/
│       └── docs/
│           ├── index.mdx                    # Landing page
│           ├── getting-started/
│           │   ├── installation.mdx
│           │   ├── quick-start.mdx
│           │   └── why-rxjs-ai.mdx
│           ├── core/
│           │   ├── create-store.mdx
│           │   ├── create-command-bus.mdx
│           │   ├── create-async-controller.mdx
│           │   └── create-view-model.mdx
│           ├── ai/
│           │   ├── stream-text.mdx
│           │   ├── generate-text.mdx
│           │   ├── chat-controller.mdx
│           │   ├── tools.mdx
│           │   ├── agents.mdx
│           │   ├── generate-object.mdx
│           │   ├── stream-object.mdx
│           │   └── embeddings.mdx
│           ├── providers/
│           │   ├── overview.mdx
│           │   ├── openai.mdx
│           │   ├── anthropic.mdx
│           │   ├── google.mdx
│           │   └── ollama.mdx
│           ├── ui/
│           │   ├── react.mdx
│           │   ├── vue.mdx
│           │   ├── svelte.mdx
│           │   └── angular.mdx
│           ├── advanced/
│           │   ├── middleware.mdx
│           │   ├── stream-recipes.mdx
│           │   ├── mcp.mdx
│           │   └── devtools.mdx
│           └── examples/
│               ├── chat-basic.mdx
│               ├── chat-with-tools.mdx
│               ├── streaming-text.mdx
│               ├── structured-output.mdx
│               ├── multi-model-race.mdx
│               └── research-agent.mdx
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Each docs page includes:
1. **Explanation** of the concept
2. **API reference** table
3. **Code example** that can be copied
4. **Interactive playground** where feasible (using StackBlitz or embedded sandbox)

---

## Release Strategy

| Version | Milestone | What ships |
|---------|-----------|------------|
| `0.1.0` | Current | Core primitives + chat controller (already built) |
| `0.1.1` | Phase 0 | NPM hygiene, CI, docs site, full test coverage |
| `0.2.0` | Phase 1 | `streamText()`, `generateText()`, `LanguageModel` interface |
| `0.3.0` | Phase 2 | OpenAI + Anthropic + Google + Ollama providers |
| `0.4.0` | Phase 3 | Tool calling, multi-step agents |
| `0.5.0` | Phase 4 | Structured output (`generateObject`, `streamObject`) |
| `0.6.0` | Phase 5 | Middleware system, stream recipes |
| `0.7.0` | Phase 6 | Embeddings |
| `0.8.0` | Phase 7 | Vue, Svelte, Angular adapters |
| `0.9.0` | Phase 8 | Message parts, MCP, DevTools |
| `1.0.0` | Stable | All core features battle-tested, API frozen |

---

## NPM Package Structure (Monorepo — Phase 2+)

Once provider packages are added, the repo becomes a monorepo:

```
packages/
├── rxjs-ai/                  # Core library (current code)
├── @rxjs-ai/openai/          # OpenAI provider
├── @rxjs-ai/anthropic/       # Anthropic provider
├── @rxjs-ai/google/          # Google provider
├── @rxjs-ai/ollama/          # Ollama provider
├── @rxjs-ai/provider-utils/  # Shared HTTP/SSE utilities
├── @rxjs-ai/vue/             # Vue composables
├── @rxjs-ai/svelte/          # Svelte stores
└── @rxjs-ai/angular/         # Angular services
docs/                          # Documentation website
```

Until Phase 2, the repo stays as a single package.

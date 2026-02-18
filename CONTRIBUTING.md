# Contributing to rxjs-ai

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/user/rxjs-ai.git
cd rxjs-ai

# Install dependencies
npm install

# Run type checks
npm run typecheck

# Run tests
npm run test

# Build
npm run build
```

## Project Structure

```
src/
├── core/                   # Framework-agnostic primitives
│   ├── createStore.ts        # Reactive state container
│   ├── createCommandBus.ts   # Type-safe event bus
│   └── createAsyncController.ts  # Async request lifecycle
├── ai/                     # AI-specific primitives
│   ├── types.ts              # Shared AI types
│   └── createChatController.ts   # Chat session management
├── ui/                     # UI integration layer
│   ├── createViewModel.ts    # Stream projection
│   └── react/
│       └── useObservableValue.ts  # React hook
└── index.ts                # Public API entry point

test/                       # Test files (mirrors src structure)
docs/                       # Documentation website (Starlight)
```

## Writing Code

### Conventions

- **TypeScript strict mode** — no `any`, no unchecked index access
- **Observable-first** — every public API should return or accept Observables
- **BehaviorSubject for state** — when current value matters, use BehaviorSubject
- **Subject for events** — when only future emissions matter, use Subject
- **destroy() pattern** — every controller/service must have a `destroy()` method that completes all subjects
- **No side effects on import** — all modules must be `sideEffects: false` compatible

### Naming

- Factory functions: `create*` (e.g., `createStore`, `createChatController`)
- Types/interfaces: PascalCase (e.g., `ChatMessage`, `AsyncState`)
- Observable properties: suffix with `$` (e.g., `messages$`, `state$`)
- Options types: `Create*Options` (e.g., `CreateChatControllerOptions`)

### Testing

Tests live in `test/` and use Vitest:

```bash
# Run all tests
npm run test

# Run with watch mode
npx vitest

# Run a specific test file
npx vitest createStore
```

Every new primitive needs tests covering:
1. Happy path (basic usage)
2. Edge cases (empty input, rapid calls)
3. Cancellation / cleanup
4. Type safety (compile-time, not runtime)

### Committing

- Use [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add streamText primitive`
  - `fix: handle empty message in createChatController`
  - `docs: add tool calling guide`
  - `test: add coverage for createAsyncController cancel`
  - `chore: update dependencies`

## Adding a New Primitive

1. Create the source file in the appropriate directory (`core/`, `ai/`, `ui/`)
2. Export it from the directory's `index.ts`
3. Add tests in `test/`
4. Add a docs page in `docs/src/content/docs/`
5. Update the README API reference if it's a top-level export

## Adding a Provider Package

Provider packages (Phase 2+) live in `packages/@rxjs-ai/<provider>/`:

1. Create the package directory with its own `package.json`, `tsconfig.json`
2. Implement the `LanguageModel` interface
3. Add integration tests with a mock HTTP server
4. Add a docs page under `docs/src/content/docs/providers/`

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes with tests
3. Run `npm run typecheck && npm run test && npm run build`
4. Open a PR with a clear description of what changed and why
5. Link any related issues

## Questions?

Open an issue on GitHub — we're happy to help.

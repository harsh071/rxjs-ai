import { Observable, filter, map, scan, share, tap } from "rxjs";
import type {
  LanguageModel,
  LanguageModelRequest,
  Message,
  TextDeltaEvent,
  TextResult,
  TextStreamEvent,
} from "./language-model";

export interface StreamTextOptions {
  readonly model: LanguageModel;
  readonly messages: readonly Message[];
  readonly system?: string | undefined;
  readonly temperature?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly topP?: number | undefined;
  readonly topK?: number | undefined;
  readonly stopSequences?: readonly string[] | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly onFinish?: ((result: TextResult) => void) | undefined;
}

export interface StreamTextResult {
  readonly stream$: Observable<TextStreamEvent>;
  readonly text$: Observable<string>;
  readonly delta$: Observable<string>;
}

function applyAbortSignal<T>(signal: AbortSignal | undefined) {
  return (source: Observable<T>): Observable<T> => {
    if (!signal) return source;

    return new Observable<T>((subscriber) => {
      if (signal.aborted) {
        subscriber.error(signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
        return;
      }

      const onAbort = () => {
        subscriber.error(signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
      };

      signal.addEventListener("abort", onAbort, { once: true });

      const subscription = source.subscribe(subscriber);

      return () => {
        signal.removeEventListener("abort", onAbort);
        subscription.unsubscribe();
      };
    });
  };
}

function buildRequest(options: StreamTextOptions): LanguageModelRequest {
  const req: {
    messages: readonly Message[];
    system?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: readonly string[];
    signal?: AbortSignal;
  } = { messages: options.messages };

  if (options.system !== undefined) req.system = options.system;
  if (options.temperature !== undefined) req.temperature = options.temperature;
  if (options.maxTokens !== undefined) req.maxTokens = options.maxTokens;
  if (options.topP !== undefined) req.topP = options.topP;
  if (options.topK !== undefined) req.topK = options.topK;
  if (options.stopSequences !== undefined) req.stopSequences = options.stopSequences;
  if (options.signal !== undefined) req.signal = options.signal;

  return req;
}

export function streamText(options: StreamTextOptions): StreamTextResult {
  const request = buildRequest(options);

  const stream$ = options.model.doStream(request).pipe(
    applyAbortSignal(options.signal),
    tap((event) => {
      if (options.onFinish && event.type === "finish") {
        options.onFinish({
          text: event.text,
          usage: event.usage,
          finishReason: event.finishReason,
          messages: [...options.messages],
        });
      }
    }),
    share(),
  );

  const delta$: Observable<string> = stream$.pipe(
    filter((event): event is TextDeltaEvent => event.type === "text-delta"),
    map((event) => event.textDelta),
  );

  const text$: Observable<string> = delta$.pipe(
    scan((accumulated, delta) => accumulated + delta, ""),
  );

  return { stream$, text$, delta$ };
}

import { Observable } from "rxjs";
import type { LanguageModel, LanguageModelRequest, Message, TextResult } from "./language-model";

export interface GenerateTextOptions {
  readonly model: LanguageModel;
  readonly messages: readonly Message[];
  readonly system?: string | undefined;
  readonly temperature?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly topP?: number | undefined;
  readonly topK?: number | undefined;
  readonly stopSequences?: readonly string[] | undefined;
  readonly signal?: AbortSignal | undefined;
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

function buildRequest(options: GenerateTextOptions): LanguageModelRequest {
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

export function generateText(options: GenerateTextOptions): Observable<TextResult> {
  const request = buildRequest(options);
  return options.model.doGenerate(request).pipe(applyAbortSignal(options.signal));
}

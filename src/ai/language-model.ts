import { Observable } from "rxjs";

// ─── Message Types ───────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface TextPart {
  readonly type: "text";
  readonly text: string;
}

export interface ToolCallPart {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: Record<string, unknown>;
}

export interface ToolResultPart {
  readonly type: "tool-result";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly result: unknown;
}

export type MessagePart = TextPart | ToolCallPart | ToolResultPart;

export interface Message {
  readonly role: MessageRole;
  readonly content: readonly MessagePart[];
}

// ─── Usage & Result Types ────────────────────────────────────────

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export type FinishReason = "stop" | "length" | "tool-calls" | "error" | "unknown";

export interface TextResult {
  readonly text: string;
  readonly usage: TokenUsage;
  readonly finishReason: FinishReason;
  readonly messages: readonly Message[];
}

// ─── Stream Event Types ──────────────────────────────────────────

export interface TextDeltaEvent {
  readonly type: "text-delta";
  readonly textDelta: string;
}

export interface FinishEvent {
  readonly type: "finish";
  readonly text: string;
  readonly usage: TokenUsage;
  readonly finishReason: FinishReason;
}

export interface ErrorEvent {
  readonly type: "error";
  readonly error: unknown;
}

export type TextStreamEvent = TextDeltaEvent | FinishEvent | ErrorEvent;

// ─── LanguageModel Request & Interface ───────────────────────────

export interface LanguageModelRequest {
  readonly messages: readonly Message[];
  readonly system?: string | undefined;
  readonly temperature?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly topP?: number | undefined;
  readonly topK?: number | undefined;
  readonly stopSequences?: readonly string[] | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface LanguageModel {
  readonly modelId: string;
  doGenerate(request: LanguageModelRequest): Observable<TextResult>;
  doStream(request: LanguageModelRequest): Observable<TextStreamEvent>;
}

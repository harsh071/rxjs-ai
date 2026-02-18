import { Observable } from "rxjs";

export type ChatRole = "system" | "user" | "assistant" | "tool";
export type ChatStatus = "idle" | "loading" | "streaming" | "error" | "cancelled";
export type ChatChunk = string | { content: string; done?: boolean };

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  meta?: Record<string, unknown>;
}

export interface ChatModelRequest {
  messages: ChatMessage[];
  signal: AbortSignal;
}

export interface ChatModelAdapter {
  complete(request: ChatModelRequest): Observable<ChatChunk>;
}

export interface ChatState {
  messages: ChatMessage[];
  status: ChatStatus;
  error: unknown | null;
}

import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { ChatChunk, ChatMessage, ChatModelAdapter, ChatState, ChatStatus } from "./types";
import type { LanguageModel, Message } from "./language-model";
import { streamText } from "./streamText";

export interface CreateChatControllerOptions {
  now?: () => number;
  idGenerator?: () => string;
  initialMessages?: ChatMessage[];
  system?: string | undefined;
  temperature?: number | undefined;
  maxTokens?: number | undefined;
}

export interface ChatController {
  messages$: Observable<ChatMessage[]>;
  status$: Observable<ChatStatus>;
  error$: Observable<unknown | null>;
  state$: Observable<ChatState>;
  getState(): ChatState;
  send(content: string, meta?: Record<string, unknown>): void;
  retryLast(): void;
  cancel(): void;
  destroy(): void;
}

function defaultIdGenerator(): string {
  return `msg_${Math.random().toString(36).slice(2, 12)}`;
}

function chunkToText(chunk: ChatChunk): string {
  return typeof chunk === "string" ? chunk : chunk.content;
}

function chunkIsDone(chunk: ChatChunk): boolean {
  return typeof chunk === "string" ? false : Boolean(chunk.done);
}

function isLanguageModel(model: LanguageModel | ChatModelAdapter): model is LanguageModel {
  return "doStream" in model && "doGenerate" in model && "modelId" in model;
}

function chatMessagesToMessages(chatMessages: ChatMessage[]): Message[] {
  return chatMessages.map((msg) => ({
    role: msg.role,
    content: [{ type: "text" as const, text: msg.content }],
  }));
}

export function createChatController(
  model: LanguageModel | ChatModelAdapter,
  options: CreateChatControllerOptions = {},
): ChatController {
  const now = options.now ?? Date.now;
  const idGenerator = options.idGenerator ?? defaultIdGenerator;

  const messagesSubject = new BehaviorSubject<ChatMessage[]>([...(options.initialMessages ?? [])]);
  const statusSubject = new BehaviorSubject<ChatStatus>("idle");
  const errorSubject = new BehaviorSubject<unknown | null>(null);
  const stateSubject = new BehaviorSubject<ChatState>({
    messages: messagesSubject.getValue(),
    status: statusSubject.getValue(),
    error: errorSubject.getValue(),
  });

  let activeAbortController: AbortController | null = null;
  let activeSubscription: Subscription | null = null;
  let lastRequestMessages: ChatMessage[] | null = null;

  const emitState = (): void => {
    stateSubject.next({
      messages: messagesSubject.getValue(),
      status: statusSubject.getValue(),
      error: errorSubject.getValue(),
    });
  };

  const setMessages = (messages: ChatMessage[]): void => {
    messagesSubject.next(messages);
    emitState();
  };

  const setStatus = (status: ChatStatus): void => {
    statusSubject.next(status);
    emitState();
  };

  const setError = (error: unknown | null): void => {
    errorSubject.next(error);
    emitState();
  };

  const createMessage = (
    role: ChatMessage["role"],
    content: string,
    meta?: Record<string, unknown>,
  ): ChatMessage => {
    const message: ChatMessage = {
      id: idGenerator(),
      role,
      content,
      createdAt: now(),
    };

    if (meta && Object.keys(meta).length > 0) {
      message.meta = { ...meta };
    }

    return message;
  };

  const releaseActiveRequest = (): void => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    if (activeSubscription) {
      activeSubscription.unsubscribe();
      activeSubscription = null;
    }
  };

  const finishRequest = (): void => {
    releaseActiveRequest();
    setStatus("idle");
  };

  const appendDelta = (assistantMessageId: string, textDelta: string): void => {
    if (textDelta.length > 0) {
      setStatus("streaming");
      setMessages(
        messagesSubject.getValue().map((message) =>
          message.id === assistantMessageId
            ? { ...message, content: `${message.content}${textDelta}` }
            : message,
        ),
      );
    }
  };

  const runCompletion = (baseMessages: ChatMessage[], assistantMessageId: string): void => {
    lastRequestMessages = [...baseMessages];
    releaseActiveRequest();
    setStatus("loading");
    setError(null);

    const abortController = new AbortController();
    activeAbortController = abortController;

    if (isLanguageModel(model)) {
      const messages = chatMessagesToMessages(baseMessages);
      const result = streamText({
        model,
        messages,
        system: options.system,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        signal: abortController.signal,
      });

      activeSubscription = result.delta$.subscribe({
        next: (delta) => {
          appendDelta(assistantMessageId, delta);
        },
        error: (error) => {
          setError(error);
          setStatus("error");
          releaseActiveRequest();
        },
        complete: () => {
          finishRequest();
        },
      });
    } else {
      activeSubscription = model
        .complete({
          messages: baseMessages,
          signal: abortController.signal,
        })
        .subscribe({
          next: (chunk) => {
            appendDelta(assistantMessageId, chunkToText(chunk));

            if (chunkIsDone(chunk)) {
              finishRequest();
            }
          },
          error: (error) => {
            setError(error);
            setStatus("error");
            releaseActiveRequest();
          },
          complete: () => {
            finishRequest();
          },
        });
    }
  };

  const send = (content: string, meta?: Record<string, unknown>): void => {
    const text = content.trim();
    if (text.length === 0) {
      return;
    }

    releaseActiveRequest();
    const currentMessages = messagesSubject.getValue();
    const userMessage = createMessage("user", text, meta);
    const assistantMessage = createMessage("assistant", "");

    setMessages([...currentMessages, userMessage, assistantMessage]);
    runCompletion([...currentMessages, userMessage], assistantMessage.id);
  };

  const retryLast = (): void => {
    if (!lastRequestMessages) {
      return;
    }

    releaseActiveRequest();
    const assistantMessage = createMessage("assistant", "");
    setMessages([...lastRequestMessages, assistantMessage]);
    runCompletion(lastRequestMessages, assistantMessage.id);
  };

  const cancel = (): void => {
    releaseActiveRequest();
    setStatus("cancelled");
  };

  const destroy = (): void => {
    releaseActiveRequest();
    messagesSubject.complete();
    statusSubject.complete();
    errorSubject.complete();
    stateSubject.complete();
  };

  return {
    messages$: messagesSubject.asObservable(),
    status$: statusSubject.asObservable(),
    error$: errorSubject.asObservable(),
    state$: stateSubject.asObservable(),
    getState: () => stateSubject.getValue(),
    send,
    retryLast,
    cancel,
    destroy,
  };
}

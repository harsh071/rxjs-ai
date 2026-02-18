import { describe, expect, it, vi } from "vitest";
import { Observable, of } from "rxjs";
import { createChatController } from "../src/ai/createChatController";
import { ChatModelAdapter } from "../src/ai/types";
import type { LanguageModel, TextStreamEvent } from "../src/ai/language-model";

function createMockLanguageModel(response = "Hello from model"): LanguageModel {
  const words = response.split(" ");
  return {
    modelId: "mock:test",
    doGenerate: () =>
      of({
        text: response,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: "stop" as const,
        messages: [],
      }),
    doStream: () =>
      new Observable<TextStreamEvent>((subscriber) => {
        for (let i = 0; i < words.length; i++) {
          const delta = (i === 0 ? "" : " ") + words[i]!;
          subscriber.next({ type: "text-delta", textDelta: delta });
        }
        subscriber.next({
          type: "finish",
          text: response,
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          finishReason: "stop",
        });
        subscriber.complete();
      }),
  };
}

describe("createChatController", () => {
  it("adds user and assistant messages for a simple completion", () => {
    const model: ChatModelAdapter = {
      complete: () => of("Hello from model"),
    };

    const chat = createChatController(model);
    chat.send("Hello");

    const state = chat.getState();

    expect(state.status).toBe("idle");
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]?.role).toBe("user");
    expect(state.messages[0]?.content).toBe("Hello");
    expect(state.messages[1]?.role).toBe("assistant");
    expect(state.messages[1]?.content).toBe("Hello from model");
  });

  it("supports retrying the last request", () => {
    let attempts = 0;
    const model: ChatModelAdapter = {
      complete: () => {
        attempts += 1;
        return of(`attempt ${attempts}`);
      },
    };

    const chat = createChatController(model);
    chat.send("Retry this");
    chat.retryLast();

    const state = chat.getState();

    expect(attempts).toBe(2);
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]?.role).toBe("user");
    expect(state.messages[1]?.content).toBe("attempt 2");
  });

  it("can cancel an in-flight request", () => {
    const model: ChatModelAdapter = {
      complete: () =>
        new Observable<string>(() => {
          return () => {
            // no-op teardown
          };
        }),
    };

    const chat = createChatController(model);
    chat.send("Long request");
    chat.cancel();

    expect(chat.getState().status).toBe("cancelled");
  });

  it("retryLast does nothing when no prior request exists", () => {
    const model: ChatModelAdapter = {
      complete: () => of("response"),
    };

    const chat = createChatController(model);
    chat.retryLast(); // should be a no-op

    const state = chat.getState();
    expect(state.messages).toHaveLength(0);
    expect(state.status).toBe("idle");

    chat.destroy();
  });

  it("ignores empty or whitespace-only messages", () => {
    const model: ChatModelAdapter = {
      complete: () => of("response"),
    };

    const chat = createChatController(model);
    chat.send("");
    chat.send("   ");

    expect(chat.getState().messages).toHaveLength(0);

    chat.destroy();
  });

  it("completes all streams on destroy", () => {
    const model: ChatModelAdapter = {
      complete: () => of("response"),
    };

    const chat = createChatController(model);
    const completeSpy = vi.fn();

    chat.state$.subscribe({ complete: completeSpy });

    chat.destroy();

    expect(completeSpy).toHaveBeenCalledOnce();
  });

  it("supports chunk objects with done flag", () => {
    const model: ChatModelAdapter = {
      complete: () =>
        new Observable((subscriber) => {
          subscriber.next({ content: "Hello", done: false });
          subscriber.next({ content: " World", done: true });
        }),
    };

    const chat = createChatController(model);
    chat.send("test");

    const state = chat.getState();
    expect(state.status).toBe("idle");
    expect(state.messages[1]?.content).toBe("Hello World");

    chat.destroy();
  });

  it("handles model errors by setting error status", () => {
    const model: ChatModelAdapter = {
      complete: () =>
        new Observable((subscriber) => {
          subscriber.error(new Error("model failed"));
        }),
    };

    const chat = createChatController(model);
    chat.send("test");

    const state = chat.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBeInstanceOf(Error);

    chat.destroy();
  });

  it("supports initial messages option", () => {
    const model: ChatModelAdapter = {
      complete: () => of("response"),
    };

    const chat = createChatController(model, {
      initialMessages: [
        { id: "sys", role: "system", content: "You are helpful.", createdAt: 1000 },
      ],
    });

    expect(chat.getState().messages).toHaveLength(1);
    expect(chat.getState().messages[0]?.role).toBe("system");

    chat.destroy();
  });

  it("attaches meta to user messages", () => {
    const model: ChatModelAdapter = {
      complete: () => of("response"),
    };

    const chat = createChatController(model);
    chat.send("hello", { source: "test" });

    const userMsg = chat.getState().messages[0];
    expect(userMsg?.meta).toEqual({ source: "test" });

    chat.destroy();
  });

  describe("with LanguageModel", () => {
    it("adds user and assistant messages for a simple completion", () => {
      const model = createMockLanguageModel();
      const chat = createChatController(model);
      chat.send("Hello");

      const state = chat.getState();
      expect(state.status).toBe("idle");
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0]?.role).toBe("user");
      expect(state.messages[0]?.content).toBe("Hello");
      expect(state.messages[1]?.role).toBe("assistant");
      expect(state.messages[1]?.content).toBe("Hello from model");

      chat.destroy();
    });

    it("supports retrying the last request", () => {
      let attempts = 0;
      const model: LanguageModel = {
        modelId: "mock:retry",
        doGenerate: () => {
          throw new Error("not implemented");
        },
        doStream: () => {
          attempts++;
          return new Observable<TextStreamEvent>((subscriber) => {
            subscriber.next({ type: "text-delta", textDelta: `attempt ${attempts}` });
            subscriber.complete();
          });
        },
      };

      const chat = createChatController(model);
      chat.send("Retry this");
      chat.retryLast();

      const state = chat.getState();
      expect(attempts).toBe(2);
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0]?.role).toBe("user");
      expect(state.messages[1]?.content).toBe("attempt 2");

      chat.destroy();
    });

    it("can cancel an in-flight request", () => {
      const model: LanguageModel = {
        modelId: "mock:slow",
        doGenerate: () => {
          throw new Error("not implemented");
        },
        doStream: () =>
          new Observable<TextStreamEvent>(() => {
            // never completes
          }),
      };

      const chat = createChatController(model);
      chat.send("Long request");
      chat.cancel();

      expect(chat.getState().status).toBe("cancelled");

      chat.destroy();
    });

    it("handles model errors by setting error status", () => {
      const model: LanguageModel = {
        modelId: "mock:error",
        doGenerate: () => {
          throw new Error("not implemented");
        },
        doStream: () =>
          new Observable<TextStreamEvent>((subscriber) => {
            subscriber.error(new Error("model failed"));
          }),
      };

      const chat = createChatController(model);
      chat.send("test");

      const state = chat.getState();
      expect(state.status).toBe("error");
      expect(state.error).toBeInstanceOf(Error);

      chat.destroy();
    });

    it("passes system/temperature/maxTokens to streamText", () => {
      const doStream = vi.fn(
        () =>
          new Observable<TextStreamEvent>((subscriber) => {
            subscriber.next({ type: "text-delta", textDelta: "ok" });
            subscriber.complete();
          }),
      );

      const model: LanguageModel = {
        modelId: "mock:options",
        doGenerate: () => {
          throw new Error("not implemented");
        },
        doStream,
      };

      const chat = createChatController(model, {
        system: "You are helpful.",
        temperature: 0.5,
        maxTokens: 100,
      });

      chat.send("test");

      expect(doStream).toHaveBeenCalledOnce();
      const request = doStream.mock.calls[0]![0];
      expect(request.system).toBe("You are helpful.");
      expect(request.temperature).toBe(0.5);
      expect(request.maxTokens).toBe(100);

      chat.destroy();
    });
  });
});

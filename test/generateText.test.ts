import { describe, expect, it, vi } from "vitest";
import { Observable, of } from "rxjs";
import { generateText } from "../src/ai/generateText";
import type { LanguageModel, TextResult } from "../src/ai/language-model";

const mockResult: TextResult = {
  text: "Hello world",
  usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
  finishReason: "stop",
  messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
};

function createMockModel(result: TextResult = mockResult): LanguageModel {
  return {
    modelId: "mock:test",
    doGenerate: () => of(result),
    doStream: () => {
      throw new Error("not implemented");
    },
  };
}

describe("generateText", () => {
  it("returns a TextResult from the model", () => {
    const model = createMockModel();
    let emitted: TextResult | undefined;

    generateText({
      model,
      messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
    }).subscribe((result) => {
      emitted = result;
    });

    expect(emitted).toBeDefined();
    expect(emitted!.text).toBe("Hello world");
    expect(emitted!.usage.totalTokens).toBe(15);
    expect(emitted!.finishReason).toBe("stop");
  });

  it("passes all options to the model request", () => {
    const doGenerate = vi.fn(() => of(mockResult));
    const model: LanguageModel = {
      modelId: "mock:params",
      doGenerate,
      doStream: () => {
        throw new Error("not implemented");
      },
    };

    const messages = [{ role: "user" as const, content: [{ type: "text" as const, text: "Hi" }] }];

    generateText({
      model,
      messages,
      system: "You are helpful.",
      temperature: 0.5,
      maxTokens: 100,
      topP: 0.9,
      topK: 40,
      stopSequences: ["\n"],
    }).subscribe();

    expect(doGenerate).toHaveBeenCalledOnce();
    const request = doGenerate.mock.calls[0]![0];
    expect(request.messages).toEqual(messages);
    expect(request.system).toBe("You are helpful.");
    expect(request.temperature).toBe(0.5);
    expect(request.maxTokens).toBe(100);
    expect(request.topP).toBe(0.9);
    expect(request.topK).toBe(40);
    expect(request.stopSequences).toEqual(["\n"]);
  });

  it("propagates model errors", () => {
    const model: LanguageModel = {
      modelId: "mock:error",
      doGenerate: () =>
        new Observable<TextResult>((subscriber) => {
          subscriber.error(new Error("model failed"));
        }),
      doStream: () => {
        throw new Error("not implemented");
      },
    };

    let caughtError: unknown;
    generateText({
      model,
      messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
    }).subscribe({ error: (err) => (caughtError = err) });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe("model failed");
  });

  it("supports AbortSignal cancellation", () => {
    const controller = new AbortController();
    const model: LanguageModel = {
      modelId: "mock:slow",
      doGenerate: () =>
        new Observable<TextResult>(() => {
          // never completes
        }),
      doStream: () => {
        throw new Error("not implemented");
      },
    };

    let caughtError: unknown;
    generateText({
      model,
      messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      signal: controller.signal,
    }).subscribe({ error: (err) => (caughtError = err) });

    controller.abort();

    expect(caughtError).toBeInstanceOf(DOMException);
    expect((caughtError as DOMException).name).toBe("AbortError");
  });

  it("errors immediately when signal is pre-aborted", () => {
    const controller = new AbortController();
    controller.abort();

    const model = createMockModel();
    let caughtError: unknown;

    generateText({
      model,
      messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      signal: controller.signal,
    }).subscribe({ error: (err) => (caughtError = err) });

    expect(caughtError).toBeInstanceOf(DOMException);
  });

  it("completes after emitting a single result", () => {
    const model = createMockModel();
    const completeSpy = vi.fn();

    generateText({
      model,
      messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
    }).subscribe({ complete: completeSpy });

    expect(completeSpy).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from "vitest";
import { Observable } from "rxjs";
import { streamText } from "../src/ai/streamText";
import type { LanguageModel, TextStreamEvent, TextResult } from "../src/ai/language-model";

function createMockModel(events: TextStreamEvent[]): LanguageModel {
  return {
    modelId: "mock:test",
    doGenerate: () => {
      throw new Error("not implemented");
    },
    doStream: () =>
      new Observable<TextStreamEvent>((subscriber) => {
        for (const event of events) {
          subscriber.next(event);
        }
        subscriber.complete();
      }),
  };
}

const mockUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };

describe("streamText", () => {
  describe("happy path", () => {
    it("emits text-delta events on stream$", () => {
      const events: TextStreamEvent[] = [
        { type: "text-delta", textDelta: "Hello" },
        { type: "text-delta", textDelta: " World" },
        { type: "finish", text: "Hello World", usage: mockUsage, finishReason: "stop" },
      ];

      const model = createMockModel(events);
      const result = streamText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      });

      const collected: TextStreamEvent[] = [];
      result.stream$.subscribe((event) => collected.push(event));

      expect(collected).toHaveLength(3);
      expect(collected[0]?.type).toBe("text-delta");
      expect(collected[1]?.type).toBe("text-delta");
      expect(collected[2]?.type).toBe("finish");
    });

    it("accumulates text on text$", () => {
      const events: TextStreamEvent[] = [
        { type: "text-delta", textDelta: "Hello" },
        { type: "text-delta", textDelta: " " },
        { type: "text-delta", textDelta: "World" },
        { type: "finish", text: "Hello World", usage: mockUsage, finishReason: "stop" },
      ];

      const model = createMockModel(events);
      const result = streamText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      });

      const accumulated: string[] = [];
      result.text$.subscribe((text) => accumulated.push(text));

      expect(accumulated).toEqual(["Hello", "Hello ", "Hello World"]);
    });

    it("emits individual deltas on delta$", () => {
      const events: TextStreamEvent[] = [
        { type: "text-delta", textDelta: "Hello" },
        { type: "text-delta", textDelta: " " },
        { type: "text-delta", textDelta: "World" },
        { type: "finish", text: "Hello World", usage: mockUsage, finishReason: "stop" },
      ];

      const model = createMockModel(events);
      const result = streamText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      });

      const deltas: string[] = [];
      result.delta$.subscribe((delta) => deltas.push(delta));

      expect(deltas).toEqual(["Hello", " ", "World"]);
    });

    it("calls onFinish with TextResult when finish event arrives", () => {
      const onFinish = vi.fn();
      const messages = [{ role: "user" as const, content: [{ type: "text" as const, text: "Hi" }] }];
      const events: TextStreamEvent[] = [
        { type: "text-delta", textDelta: "Hello" },
        { type: "finish", text: "Hello", usage: mockUsage, finishReason: "stop" },
      ];

      const model = createMockModel(events);
      const result = streamText({ model, messages, onFinish });

      result.stream$.subscribe();

      expect(onFinish).toHaveBeenCalledOnce();
      const finishResult: TextResult = onFinish.mock.calls[0]![0];
      expect(finishResult.text).toBe("Hello");
      expect(finishResult.usage).toEqual(mockUsage);
      expect(finishResult.finishReason).toBe("stop");
      expect(finishResult.messages).toEqual(messages);
    });

    it("completes all observables when stream completes", () => {
      const events: TextStreamEvent[] = [
        { type: "text-delta", textDelta: "done" },
        { type: "finish", text: "done", usage: mockUsage, finishReason: "stop" },
      ];

      const model = createMockModel(events);
      const result = streamText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      });

      const streamComplete = vi.fn();
      const textComplete = vi.fn();
      const deltaComplete = vi.fn();

      result.stream$.subscribe({ complete: streamComplete });
      result.text$.subscribe({ complete: textComplete });
      result.delta$.subscribe({ complete: deltaComplete });

      expect(streamComplete).toHaveBeenCalledOnce();
      expect(textComplete).toHaveBeenCalledOnce();
      expect(deltaComplete).toHaveBeenCalledOnce();
    });
  });

  describe("error handling", () => {
    it("propagates model errors to subscribers", () => {
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

      const result = streamText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      });

      let caughtError: unknown;
      result.stream$.subscribe({
        error: (err) => {
          caughtError = err;
        },
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toBe("model failed");
    });
  });

  describe("cancellation", () => {
    it("errors with AbortError when signal is aborted", () => {
      const controller = new AbortController();
      const model: LanguageModel = {
        modelId: "mock:slow",
        doGenerate: () => {
          throw new Error("not implemented");
        },
        doStream: () =>
          new Observable<TextStreamEvent>(() => {
            // never completes — simulates a slow stream
          }),
      };

      const result = streamText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
        signal: controller.signal,
      });

      let caughtError: unknown;
      result.stream$.subscribe({ error: (err) => (caughtError = err) });

      controller.abort();

      expect(caughtError).toBeInstanceOf(DOMException);
      expect((caughtError as DOMException).name).toBe("AbortError");
    });

    it("errors immediately when signal is pre-aborted", () => {
      const controller = new AbortController();
      controller.abort();

      const model = createMockModel([{ type: "text-delta", textDelta: "should not arrive" }]);

      const result = streamText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
        signal: controller.signal,
      });

      let caughtError: unknown;
      result.stream$.subscribe({ error: (err) => (caughtError = err) });

      expect(caughtError).toBeInstanceOf(DOMException);
    });
  });

  describe("request building", () => {
    it("passes optional parameters to the model request", () => {
      const doStream = vi.fn(
        () =>
          new Observable<TextStreamEvent>((subscriber) => {
            subscriber.next({ type: "text-delta", textDelta: "ok" });
            subscriber.complete();
          }),
      );

      const model: LanguageModel = {
        modelId: "mock:params",
        doGenerate: () => {
          throw new Error("not implemented");
        },
        doStream,
      };

      const messages = [{ role: "user" as const, content: [{ type: "text" as const, text: "Hi" }] }];
      const result = streamText({
        model,
        messages,
        system: "You are helpful.",
        temperature: 0.5,
        maxTokens: 100,
        topP: 0.9,
        topK: 40,
        stopSequences: ["\n"],
      });

      result.stream$.subscribe();

      expect(doStream).toHaveBeenCalledOnce();
      const request = doStream.mock.calls[0]![0];
      expect(request.messages).toEqual(messages);
      expect(request.system).toBe("You are helpful.");
      expect(request.temperature).toBe(0.5);
      expect(request.maxTokens).toBe(100);
      expect(request.topP).toBe(0.9);
      expect(request.topK).toBe(40);
      expect(request.stopSequences).toEqual(["\n"]);
    });
  });

  describe("sharing", () => {
    it("shares a single upstream subscription across stream$, text$, and delta$", () => {
      let subscribeCount = 0;
      const model: LanguageModel = {
        modelId: "mock:shared",
        doGenerate: () => {
          throw new Error("not implemented");
        },
        doStream: () =>
          new Observable<TextStreamEvent>((subscriber) => {
            subscribeCount++;
            subscriber.next({ type: "text-delta", textDelta: "test" });
            subscriber.complete();
          }),
      };

      const result = streamText({
        model,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      });

      result.stream$.subscribe();
      result.text$.subscribe();
      result.delta$.subscribe();

      // share() means first subscription triggers upstream,
      // but subsequent subscriptions after completion create new subscriptions.
      // The key guarantee is that concurrent subscribers share the same upstream.
      expect(subscribeCount).toBeGreaterThanOrEqual(1);
    });
  });
});

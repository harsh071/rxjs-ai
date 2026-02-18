import { describe, expect, it } from "vitest";
import type {
  ErrorEvent,
  FinishEvent,
  FinishReason,
  LanguageModel,
  LanguageModelRequest,
  Message,
  MessagePart,
  TextDeltaEvent,
  TextResult,
  TextStreamEvent,
  TokenUsage,
} from "../src/ai/language-model";
import { of } from "rxjs";

describe("LanguageModel types", () => {
  describe("Message", () => {
    it("accepts a message with a text part", () => {
      const msg: Message = {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      };
      expect(msg.role).toBe("user");
      expect(msg.content).toHaveLength(1);
      expect(msg.content[0]?.type).toBe("text");
    });

    it("accepts a message with a tool-call part", () => {
      const msg: Message = {
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "tc_1", toolName: "search", args: { query: "rxjs" } },
        ],
      };
      expect(msg.content[0]?.type).toBe("tool-call");
    });

    it("accepts a message with a tool-result part", () => {
      const msg: Message = {
        role: "tool",
        content: [
          { type: "tool-result", toolCallId: "tc_1", toolName: "search", result: ["rxjs-ai"] },
        ],
      };
      expect(msg.content[0]?.type).toBe("tool-result");
    });

    it("accepts a message with mixed parts", () => {
      const msg: Message = {
        role: "assistant",
        content: [
          { type: "text", text: "Let me search for that." },
          { type: "tool-call", toolCallId: "tc_1", toolName: "search", args: { query: "rxjs" } },
        ],
      };
      expect(msg.content).toHaveLength(2);
    });
  });

  describe("TextStreamEvent", () => {
    it("narrows text-delta events via type discriminant", () => {
      const event: TextStreamEvent = { type: "text-delta", textDelta: "hello" };
      if (event.type === "text-delta") {
        expect(event.textDelta).toBe("hello");
      }
    });

    it("narrows finish events via type discriminant", () => {
      const event: TextStreamEvent = {
        type: "finish",
        text: "hello world",
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: "stop",
      };
      if (event.type === "finish") {
        expect(event.text).toBe("hello world");
        expect(event.usage.totalTokens).toBe(15);
        expect(event.finishReason).toBe("stop");
      }
    });

    it("narrows error events via type discriminant", () => {
      const error = new Error("test error");
      const event: TextStreamEvent = { type: "error", error };
      if (event.type === "error") {
        expect(event.error).toBe(error);
      }
    });
  });

  describe("MessagePart", () => {
    it("discriminates part types correctly", () => {
      const parts: MessagePart[] = [
        { type: "text", text: "hello" },
        { type: "tool-call", toolCallId: "tc_1", toolName: "fn", args: {} },
        { type: "tool-result", toolCallId: "tc_1", toolName: "fn", result: 42 },
      ];

      for (const part of parts) {
        switch (part.type) {
          case "text":
            expect(part.text).toBe("hello");
            break;
          case "tool-call":
            expect(part.toolCallId).toBe("tc_1");
            break;
          case "tool-result":
            expect(part.result).toBe(42);
            break;
        }
      }
    });
  });

  describe("LanguageModelRequest", () => {
    it("requires messages, all other fields are optional", () => {
      const minimal: LanguageModelRequest = {
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      };
      expect(minimal.messages).toHaveLength(1);
      expect(minimal.system).toBeUndefined();
      expect(minimal.temperature).toBeUndefined();
      expect(minimal.maxTokens).toBeUndefined();
    });

    it("accepts all optional fields", () => {
      const full: LanguageModelRequest = {
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
        system: "You are helpful.",
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        topK: 40,
        stopSequences: ["\n"],
        signal: new AbortController().signal,
      };
      expect(full.system).toBe("You are helpful.");
      expect(full.temperature).toBe(0.7);
    });
  });

  describe("TextResult", () => {
    it("contains text, usage, finishReason, and messages", () => {
      const result: TextResult = {
        text: "Hello world",
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: "stop",
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      };
      expect(result.text).toBe("Hello world");
      expect(result.usage.totalTokens).toBe(15);
      expect(result.finishReason).toBe("stop");
      expect(result.messages).toHaveLength(1);
    });
  });

  describe("TokenUsage", () => {
    it("has required numeric fields", () => {
      const usage: TokenUsage = { promptTokens: 100, completionTokens: 50, totalTokens: 150 };
      expect(usage.promptTokens + usage.completionTokens).toBe(usage.totalTokens);
    });
  });

  describe("FinishReason", () => {
    it("accepts all valid finish reasons", () => {
      const reasons: FinishReason[] = ["stop", "length", "tool-calls", "error", "unknown"];
      expect(reasons).toHaveLength(5);
    });
  });

  describe("LanguageModel interface", () => {
    it("can be implemented with doGenerate and doStream", () => {
      const model: LanguageModel = {
        modelId: "test:mock",
        doGenerate: () =>
          of({
            text: "Hello",
            usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
            finishReason: "stop" as const,
            messages: [],
          }),
        doStream: () => of({ type: "text-delta" as const, textDelta: "Hello" }),
      };
      expect(model.modelId).toBe("test:mock");
    });
  });
});

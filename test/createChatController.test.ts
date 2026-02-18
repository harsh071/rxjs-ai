import { describe, expect, it } from "vitest";
import { Observable, of } from "rxjs";
import { createChatController } from "../src/ai/createChatController";
import { ChatModelAdapter } from "../src/ai/types";

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
});

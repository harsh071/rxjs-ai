import { describe, expect, it, vi } from "vitest";
import { createCommandBus } from "../src/core/createCommandBus";

type TestCommands = {
  "user/login": { username: string };
  "user/logout": undefined;
  "search/query": { term: string };
};

describe("createCommandBus", () => {
  it("dispatches commands and receives them on commands$", () => {
    const bus = createCommandBus<TestCommands>({ now: () => 1000 });
    const received: unknown[] = [];

    bus.commands$.subscribe((cmd) => received.push(cmd));

    bus.dispatch("user/login", { username: "alice" });

    expect(received).toEqual([
      { type: "user/login", payload: { username: "alice" }, timestamp: 1000 },
    ]);

    bus.destroy();
  });

  it("filters commands by type with ofType", () => {
    const bus = createCommandBus<TestCommands>({ now: () => 1 });
    const logins: unknown[] = [];
    const searches: unknown[] = [];

    bus.ofType("user/login").subscribe((cmd) => logins.push(cmd));
    bus.ofType("search/query").subscribe((cmd) => searches.push(cmd));

    bus.dispatch("user/login", { username: "bob" });
    bus.dispatch("search/query", { term: "rxjs" });
    bus.dispatch("user/logout", undefined);

    expect(logins).toHaveLength(1);
    expect(logins[0]).toEqual(
      expect.objectContaining({ type: "user/login", payload: { username: "bob" } }),
    );

    expect(searches).toHaveLength(1);
    expect(searches[0]).toEqual(
      expect.objectContaining({ type: "search/query", payload: { term: "rxjs" } }),
    );

    bus.destroy();
  });

  it("supports filtering multiple types with ofType", () => {
    const bus = createCommandBus<TestCommands>({ now: () => 1 });
    const received: unknown[] = [];

    bus.ofType("user/login", "user/logout").subscribe((cmd) => received.push(cmd));

    bus.dispatch("user/login", { username: "carol" });
    bus.dispatch("search/query", { term: "test" });
    bus.dispatch("user/logout", undefined);

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual(expect.objectContaining({ type: "user/login" }));
    expect(received[1]).toEqual(expect.objectContaining({ type: "user/logout" }));

    bus.destroy();
  });

  it("uses custom timestamp function", () => {
    let tick = 100;
    const bus = createCommandBus<TestCommands>({ now: () => tick++ });
    const timestamps: number[] = [];

    bus.commands$.subscribe((cmd) => timestamps.push(cmd.timestamp));

    bus.dispatch("user/login", { username: "dave" });
    bus.dispatch("user/logout", undefined);

    expect(timestamps).toEqual([100, 101]);

    bus.destroy();
  });

  it("completes all streams on destroy", () => {
    const bus = createCommandBus<TestCommands>();
    const completeSpy = vi.fn();

    bus.commands$.subscribe({ complete: completeSpy });

    bus.destroy();

    expect(completeSpy).toHaveBeenCalledOnce();
  });

  it("does not emit to subscribers after destroy", () => {
    const bus = createCommandBus<TestCommands>();
    const received: unknown[] = [];

    bus.commands$.subscribe((cmd) => received.push(cmd));

    bus.destroy();
    // Subject is completed, next calls are ignored
    bus.dispatch("user/login", { username: "eve" });

    expect(received).toHaveLength(0);
  });
});

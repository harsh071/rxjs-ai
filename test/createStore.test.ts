import { describe, expect, it } from "vitest";
import { createStore } from "../src/core/createStore";

describe("createStore", () => {
  it("supports setState and patchState", () => {
    const store = createStore({
      count: 0,
      label: "start",
    });

    store.setState((state) => ({
      ...state,
      count: state.count + 2,
    }));
    store.patchState({
      label: "updated",
    });

    expect(store.getState()).toEqual({
      count: 2,
      label: "updated",
    });
  });

  it("emits selected values with distinct filtering", () => {
    const store = createStore({
      count: 0,
      label: "start",
    });
    const selected: number[] = [];

    const subscription = store.select((state) => state.count).subscribe((value) => {
      selected.push(value);
    });

    store.patchState({ label: "no-count-change" });
    store.patchState({ count: 1 });
    store.patchState({ count: 1 });

    expect(selected).toEqual([0, 1]);

    subscription.unsubscribe();
    store.destroy();
  });
});

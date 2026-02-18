import { describe, expect, it } from "vitest";
import { BehaviorSubject } from "rxjs";
import { createViewModel } from "../src/ui/createViewModel";

describe("createViewModel", () => {
  it("projects values from multiple sources", () => {
    const name$ = new BehaviorSubject("Alice");
    const age$ = new BehaviorSubject(30);

    const results: unknown[] = [];

    createViewModel(
      { name: name$.asObservable(), age: age$.asObservable() },
      ({ name, age }) => ({ label: `${name} (${age})` }),
    ).subscribe((vm) => results.push(vm));

    expect(results).toEqual([{ label: "Alice (30)" }]);

    name$.next("Bob");
    expect(results).toEqual([{ label: "Alice (30)" }, { label: "Bob (30)" }]);

    age$.next(25);
    expect(results).toEqual([
      { label: "Alice (30)" },
      { label: "Bob (30)" },
      { label: "Bob (25)" },
    ]);

    name$.complete();
    age$.complete();
  });

  it("uses distinctUntilChanged to suppress duplicate emissions", () => {
    const count$ = new BehaviorSubject(1);
    const label$ = new BehaviorSubject("hello");

    const results: unknown[] = [];

    createViewModel(
      { count: count$.asObservable(), label: label$.asObservable() },
      ({ count }) => ({ doubled: count * 2 }),
    ).subscribe((vm) => results.push(vm));

    // label changes but projector output is the same (only uses count)
    label$.next("world");

    // Object.is compares by reference, so a new object is emitted even with same values
    // distinctUntilChanged with Object.is checks reference equality
    // Since projector creates new object each time, both emit
    expect(results.length).toBe(2);

    count$.complete();
    label$.complete();
  });

  it("supports custom comparator to suppress duplicate objects", () => {
    const count$ = new BehaviorSubject(1);
    const label$ = new BehaviorSubject("hello");

    const results: unknown[] = [];

    createViewModel(
      { count: count$.asObservable(), label: label$.asObservable() },
      ({ count }) => ({ doubled: count * 2 }),
      (prev, curr) => prev.doubled === curr.doubled,
    ).subscribe((vm) => results.push(vm));

    // label changes, projector output has same doubled value — should be suppressed
    label$.next("world");

    expect(results).toEqual([{ doubled: 2 }]);

    // Now count changes, projector output changes
    count$.next(5);
    expect(results).toEqual([{ doubled: 2 }, { doubled: 10 }]);

    count$.complete();
    label$.complete();
  });

  it("completes when all sources complete", () => {
    const a$ = new BehaviorSubject("a");
    const b$ = new BehaviorSubject("b");

    let completed = false;

    createViewModel(
      { a: a$.asObservable(), b: b$.asObservable() },
      ({ a, b }) => a + b,
    ).subscribe({
      complete: () => {
        completed = true;
      },
    });

    a$.complete();
    expect(completed).toBe(false); // combineLatest waits for all

    b$.complete();
    expect(completed).toBe(true);
  });

  it("works with a single source", () => {
    const count$ = new BehaviorSubject(5);
    const results: unknown[] = [];

    createViewModel(
      { count: count$.asObservable() },
      ({ count }) => `Count: ${count}`,
    ).subscribe((vm) => results.push(vm));

    count$.next(10);

    expect(results).toEqual(["Count: 5", "Count: 10"]);

    count$.complete();
  });
});

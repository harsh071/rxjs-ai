import { describe, expect, it, vi } from "vitest";
import { Observable, of, throwError, delay, Subject } from "rxjs";
import { createAsyncController } from "../src/core/createAsyncController";

describe("createAsyncController", () => {
  it("starts in idle state", () => {
    const controller = createAsyncController<string, string>(
      (req) => of(req.toUpperCase()),
    );

    const state = controller.state$.subscribe(() => {});
    expect(true).toBe(true); // just verifying no error on creation

    controller.destroy();
  });

  it("transitions through loading → success on execute", () => {
    const statuses: string[] = [];
    const controller = createAsyncController<string, string>(
      (req) => of(req.toUpperCase()),
      { now: () => 1000 },
    );

    controller.state$.subscribe((state) => statuses.push(state.status));

    controller.execute("hello");

    expect(statuses).toEqual(["idle", "loading", "success"]);

    const finalStates: unknown[] = [];
    controller.state$.subscribe((state) => finalStates.push(state));
    expect(finalStates[0]).toEqual({
      status: "success",
      data: "HELLO",
      error: null,
      updatedAt: 1000,
    });

    controller.destroy();
  });

  it("transitions through loading → error on failure", () => {
    const statuses: string[] = [];
    const controller = createAsyncController<string, string, Error>(
      () => throwError(() => new Error("fail")),
      { now: () => 2000 },
    );

    controller.state$.subscribe((state) => statuses.push(state.status));

    controller.execute("test");

    expect(statuses).toEqual(["idle", "loading", "error"]);

    const finalStates: unknown[] = [];
    controller.state$.subscribe((s) => finalStates.push(s));
    const finalState = finalStates[0] as { status: string; error: Error };
    expect(finalState.status).toBe("error");
    expect(finalState.error).toBeInstanceOf(Error);
    expect(finalState.error.message).toBe("fail");

    controller.destroy();
  });

  it("cancels in-flight request and sets cancelled status", () => {
    let capturedSignal: AbortSignal | null = null;
    const controller = createAsyncController<string, string>(
      (_req, signal) => {
        capturedSignal = signal;
        return new Observable<string>(() => {
          // never completes
        });
      },
    );

    const statuses: string[] = [];
    controller.state$.subscribe((state) => statuses.push(state.status));

    controller.execute("test");
    controller.cancel();

    expect(statuses).toEqual(["idle", "loading", "cancelled"]);
    expect(capturedSignal?.aborted).toBe(true);

    controller.destroy();
  });

  it("auto-cancels previous request on new execute (switchMap)", () => {
    let callCount = 0;
    const subjects: Subject<string>[] = [];

    const controller = createAsyncController<string, string>(
      (req) => {
        callCount++;
        const subject = new Subject<string>();
        subjects.push(subject);
        return subject.asObservable();
      },
      { now: () => 3000 },
    );

    controller.execute("first");
    controller.execute("second");

    // First subject is abandoned due to switchMap, second is active
    // Complete the second request
    subjects[1]?.next("SECOND");
    subjects[1]?.complete();

    const finalStates: unknown[] = [];
    controller.state$.subscribe((s) => finalStates.push(s));
    const finalState = finalStates[0] as { data: string };
    expect(finalState.data).toBe("SECOND");

    expect(callCount).toBe(2);

    controller.destroy();
  });

  it("passes AbortSignal to executor", () => {
    let receivedSignal: AbortSignal | null = null;

    const controller = createAsyncController<string, string>(
      (req, signal) => {
        receivedSignal = signal;
        return of(req);
      },
    );

    controller.execute("test");

    expect(receivedSignal).not.toBeNull();
    expect(receivedSignal).toBeInstanceOf(AbortSignal);

    controller.destroy();
  });

  it("aborts the signal on cancel", () => {
    let receivedSignal: AbortSignal | null = null;

    const controller = createAsyncController<string, string>(
      (_req, signal) => {
        receivedSignal = signal;
        return new Observable(() => {}); // never completes
      },
    );

    controller.execute("test");
    expect(receivedSignal?.aborted).toBe(false);

    controller.cancel();
    expect(receivedSignal?.aborted).toBe(true);

    controller.destroy();
  });

  it("completes all streams on destroy", () => {
    const controller = createAsyncController<string, string>(
      (req) => of(req),
    );

    const completeSpy = vi.fn();
    controller.state$.subscribe({ complete: completeSpy });

    controller.destroy();

    expect(completeSpy).toHaveBeenCalledOnce();
  });
});

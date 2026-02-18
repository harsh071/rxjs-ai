import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  map,
  of,
  switchMap,
  takeUntil,
} from "rxjs";

export type AsyncStatus = "idle" | "loading" | "success" | "error" | "cancelled";

export interface AsyncState<Data, ErrorType = unknown> {
  status: AsyncStatus;
  data: Data | null;
  error: ErrorType | null;
  updatedAt: number | null;
}

export interface AsyncController<Request, Data, ErrorType = unknown> {
  state$: Observable<AsyncState<Data, ErrorType>>;
  execute(request: Request): void;
  cancel(): void;
  destroy(): void;
}

export interface CreateAsyncControllerOptions {
  now?: () => number;
}

export function createAsyncController<Request, Data, ErrorType = unknown>(
  executor: (request: Request, signal: AbortSignal) => Observable<Data>,
  options: CreateAsyncControllerOptions = {},
): AsyncController<Request, Data, ErrorType> {
  const now = options.now ?? Date.now;
  const requestSubject = new Subject<Request>();
  const destroySubject = new Subject<void>();
  const stateSubject = new BehaviorSubject<AsyncState<Data, ErrorType>>({
    status: "idle",
    data: null,
    error: null,
    updatedAt: null,
  });

  let activeAbortController: AbortController | null = null;

  const setState = (nextState: AsyncState<Data, ErrorType>): void => {
    stateSubject.next(nextState);
  };

  const setStatus = (status: AsyncStatus): void => {
    const currentState = stateSubject.getValue();
    setState({
      ...currentState,
      status,
    });
  };

  const releaseActiveRequest = (): void => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
  };

  requestSubject
    .pipe(
      switchMap((request) => {
        releaseActiveRequest();
        activeAbortController = new AbortController();
        const currentState = stateSubject.getValue();

        setState({
          ...currentState,
          status: "loading",
          error: null,
        });

        return executor(request, activeAbortController.signal).pipe(
          map((data) => ({ kind: "success" as const, data })),
          catchError((error: ErrorType) => of({ kind: "error" as const, error })),
        );
      }),
      takeUntil(destroySubject),
    )
    .subscribe((result) => {
      const currentState = stateSubject.getValue();

      if (result.kind === "success") {
        setState({
          status: "success",
          data: result.data,
          error: null,
          updatedAt: now(),
        });
        activeAbortController = null;
        return;
      }

      setState({
        ...currentState,
        status: "error",
        error: result.error,
        updatedAt: now(),
      });
      activeAbortController = null;
    });

  const cancel = (): void => {
    releaseActiveRequest();
    setStatus("cancelled");
  };

  const destroy = (): void => {
    releaseActiveRequest();
    destroySubject.next();
    destroySubject.complete();
    requestSubject.complete();
    stateSubject.complete();
  };

  return {
    state$: stateSubject.asObservable(),
    execute: (request: Request) => {
      requestSubject.next(request);
    },
    cancel,
    destroy,
  };
}

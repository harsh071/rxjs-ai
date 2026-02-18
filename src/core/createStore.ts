import { BehaviorSubject, Observable, distinctUntilChanged, map } from "rxjs";

export type StateUpdater<State> = State | ((previousState: State) => State);
export type StatePatch<State extends object> =
  | Partial<State>
  | ((previousState: State) => Partial<State>);

export interface Store<State extends object> {
  state$: Observable<State>;
  getState(): State;
  setState(updater: StateUpdater<State>): void;
  patchState(patch: StatePatch<State>): void;
  select<Selected>(
    selector: (state: State) => Selected,
    compare?: (previous: Selected, current: Selected) => boolean,
  ): Observable<Selected>;
  destroy(): void;
}

function resolveState<State>(currentState: State, updater: StateUpdater<State>): State {
  return typeof updater === "function"
    ? (updater as (previousState: State) => State)(currentState)
    : updater;
}

function resolvePatch<State extends object>(
  currentState: State,
  patch: StatePatch<State>,
): Partial<State> {
  return typeof patch === "function"
    ? (patch as (previousState: State) => Partial<State>)(currentState)
    : patch;
}

export function createStore<State extends object>(initialState: State): Store<State> {
  const stateSubject = new BehaviorSubject<State>(initialState);

  const setState = (updater: StateUpdater<State>): void => {
    const nextState = resolveState(stateSubject.getValue(), updater);
    stateSubject.next(nextState);
  };

  const patchState = (patch: StatePatch<State>): void => {
    const currentState = stateSubject.getValue();
    const nextPatch = resolvePatch(currentState, patch);
    stateSubject.next({
      ...currentState,
      ...nextPatch,
    });
  };

  const select = <Selected>(
    selector: (state: State) => Selected,
    compare: (previous: Selected, current: Selected) => boolean = Object.is,
  ): Observable<Selected> =>
    stateSubject.asObservable().pipe(
      map(selector),
      distinctUntilChanged(compare),
    );

  return {
    state$: stateSubject.asObservable(),
    getState: () => stateSubject.getValue(),
    setState,
    patchState,
    select,
    destroy: () => {
      stateSubject.complete();
    },
  };
}

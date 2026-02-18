import { Observable, combineLatest, distinctUntilChanged, map } from "rxjs";

type ObservableMap = Record<string, Observable<unknown>>;

type ObservableValues<Sources extends ObservableMap> = {
  [Key in keyof Sources]: Sources[Key] extends Observable<infer Value> ? Value : never;
};

export function createViewModel<Sources extends ObservableMap, ViewModel>(
  sources: Sources,
  projector: (values: ObservableValues<Sources>) => ViewModel,
  compare: (previous: ViewModel, current: ViewModel) => boolean = Object.is,
): Observable<ViewModel> {
  return combineLatest(sources).pipe(
    map((values) => projector(values as ObservableValues<Sources>)),
    distinctUntilChanged(compare),
  );
}

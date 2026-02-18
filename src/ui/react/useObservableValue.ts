import { useEffect, useState } from "react";
import { Observable, Subscription } from "rxjs";

export function useObservableValue<Value>(
  source$: Observable<Value>,
  initialValue: Value,
): Value {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const subscription: Subscription = source$.subscribe((nextValue) => {
      setValue(nextValue);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [source$]);

  return value;
}

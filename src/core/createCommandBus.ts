import { Observable, Subject, filter } from "rxjs";

export type CommandMap = Record<string, unknown>;

export interface CommandEnvelope<
  Commands extends CommandMap,
  CommandType extends keyof Commands = keyof Commands,
> {
  type: CommandType;
  payload: Commands[CommandType];
  timestamp: number;
}

export interface CommandBus<Commands extends CommandMap> {
  commands$: Observable<CommandEnvelope<Commands>>;
  dispatch<CommandType extends keyof Commands>(
    type: CommandType,
    payload: Commands[CommandType],
  ): void;
  ofType<CommandType extends keyof Commands>(
    ...types: CommandType[]
  ): Observable<CommandEnvelope<Commands, CommandType>>;
  destroy(): void;
}

export interface CreateCommandBusOptions {
  now?: () => number;
}

export function createCommandBus<Commands extends CommandMap>(
  options: CreateCommandBusOptions = {},
): CommandBus<Commands> {
  const now = options.now ?? Date.now;
  const commandSubject = new Subject<CommandEnvelope<Commands>>();

  const dispatch = <CommandType extends keyof Commands>(
    type: CommandType,
    payload: Commands[CommandType],
  ): void => {
    commandSubject.next({
      type,
      payload,
      timestamp: now(),
    });
  };

  const ofType = <CommandType extends keyof Commands>(
    ...types: CommandType[]
  ): Observable<CommandEnvelope<Commands, CommandType>> => {
    const typeSet = new Set<keyof Commands>(types);
    return commandSubject.asObservable().pipe(
      filter(
        (
          command,
        ): command is CommandEnvelope<Commands, CommandType> => typeSet.has(command.type),
      ),
    );
  };

  return {
    commands$: commandSubject.asObservable(),
    dispatch,
    ofType,
    destroy: () => {
      commandSubject.complete();
    },
  };
}

export type DepthFirstTraversalInstanceConfigDeepPartial<
  T,
  IgnoreContentOf extends string,
  > = T extends object
  ? T extends unknown[]
    ? T
    : {
      [P in keyof T]?: P extends IgnoreContentOf
        ? T[P]
        : // eslint-disable-next-line @typescript-eslint/ban-types
        T[P] extends Function | null
          ? T[P]
          : DepthFirstTraversalInstanceConfigDeepPartial<T[P], IgnoreContentOf>;
    }
  : T;

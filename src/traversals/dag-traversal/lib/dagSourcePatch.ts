const sourceKeys = ['traversableGraph', 'traversableTree'] as const;

type DagSourcePatch = Partial<Record<typeof sourceKeys[number], unknown>>;

/** Source presence is own-and-defined, including nonenumerable properties. */
export function captureDagSourcePatch(input: object): DagSourcePatch {
  const sources: DagSourcePatch = {};
  for (const key of sourceKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = (input as DagSourcePatch)[key];
      if (value !== undefined) sources[key] = value;
    }
  }
  return sources;
}

/** Copy the usual enumerable options without reading source getters again. */
export function captureDagConfigPatch<Input extends object>(
  input: Input,
  sources: DagSourcePatch,
): Input {
  const options: Record<PropertyKey, unknown> = {};
  for (const key of Reflect.ownKeys(input)) {
    if (
      key !== 'traversableGraph' &&
      key !== 'traversableTree' &&
      Object.prototype.propertyIsEnumerable.call(input, key)
    ) {
      Object.defineProperty(options, key, {
        value: Reflect.get(input, key),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  }
  return { ...options, ...sources } as Input;
}

export function assertExactlyOneDagSource(
  sources: DagSourcePatch,
): 'tree' | 'graph' {
  const graph = sources.traversableGraph !== undefined;
  const tree = sources.traversableTree !== undefined;
  if (graph === tree) {
    throw new TypeError(
      'DAG traversal requires exactly one tree or graph source',
    );
  }
  return graph ? 'graph' : 'tree';
}

/** Public option bags have own, schema-specific fields; payloads/protocols do not. */
export function assertOwnKeys(
  options: unknown,
  keys: readonly string[],
): asserts options is object {
  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError('Options must be an object');
  }
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== 'string' || !keys.includes(key)) {
      throw new TypeError(`Unknown option: ${String(key)}`);
    }
  }
}

export const TREE_OPTION_KEYS = [
  'treeDiscoverySource',
  'transformChildHintsBeforeResolution',
  'visitors',
  'retainDiscoveredTreeBeforeVisitorCommands',
] as const;
export const DAG_OPTION_KEYS = [
  'treeDiscoverySource',
  'dagDiscoverySource',
  'transformChildHintsBeforeResolution',
  'visitors',
  'retainDiscoveredGraphBeforeVisitorCommands',
  'workCompletionPolicy',
  'discoveryTiming',
  'rootWorkPrerequisitePolicy',
  'undeclaredWorkPrerequisitePolicy',
  'sourceRootIsHiddenEntryHolder',
  'acceptedCompletedWorkVertexIds',
] as const;
export const OBJECT_SOURCE_OPTION_KEYS = [
  'enumerateChildPropertyHints',
  'mapInputToRootProperty',
  'resolveChildPropertyOrUseDefault',
] as const;
export const OBJECT_MUTATION_OPTION_KEYS = [
  'arrayAssemblyIndexPolicy',
  'assembledPropertyKeyCollisionPolicy',
  'matchesArrayAssemblyPredicate',
  'matchesObjectAssemblyPredicate',
  'assembleArrayValueFromChildProperties',
  'assembleObjectValueFromChildProperties',
  'assemblyCache',
] as const;

/** Undefined patch fields retain prior settings, including non-enumerable own fields. */
export function definedOptions<T extends object>(
  input: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const result: { [K in keyof T]?: Exclude<T[K], undefined> } = {};
  for (const key of Reflect.ownKeys(input)) {
    const value: unknown = Reflect.get(input, key);
    if (value !== undefined)
      Object.defineProperty(result, key, { value, enumerable: true });
  }
  return result;
}

/** Snapshot supported structural fields, including inherited accessors, once. */
export function captureOptionFields<T extends object, K extends keyof T>(
  input: T,
  keys: readonly K[],
): Pick<T, K> {
  // Every requested key is copied with its original replacementData; Pick describes that
  // exact mapped record while preserving the input's required/optional fields.
  return Object.fromEntries(keys.map((key) => [key, input[key]])) as Pick<T, K>;
}

export function assertOptionalCallbacks(
  options: object,
  keys: readonly string[],
): void {
  for (const key of keys) {
    const value: unknown = Reflect.get(options, key);
    if (value !== undefined && typeof value !== 'function') {
      throw new TypeError(`${key} must be a function`);
    }
  }
}

export function assertTraversalFields(
  options: object,
  phases: readonly string[],
): void {
  for (const key of [
    'retainDiscoveredTreeBeforeVisitorCommands',
    'retainDiscoveredGraphBeforeVisitorCommands',
    'sourceRootIsHiddenEntryHolder',
  ]) {
    const value: unknown = Reflect.get(options, key);
    if (value !== undefined && typeof value !== 'boolean')
      throw new TypeError(`${key} must be boolean`);
  }
  const sorter: unknown = Reflect.get(
    options,
    'transformChildHintsBeforeResolution',
  );
  if (sorter !== undefined && sorter !== null && typeof sorter !== 'function')
    throw new TypeError(
      'transformChildHintsBeforeResolution must be a function or null',
    );
  const visitors: unknown = Reflect.get(options, 'visitors');
  if (visitors !== undefined) assertOwnKeys(visitors, phases);
  const discoveryTiming: unknown = Reflect.get(options, 'discoveryTiming');
  if (
    discoveryTiming !== undefined &&
    discoveryTiming !== 'incrementalDuringTraversal' &&
    discoveryTiming !== 'completeBeforeAnyVisitor'
  )
    throw new TypeError('Invalid discoveryTiming policy');
  const acceptedCompletedWorkVertexIds: unknown = Reflect.get(
    options,
    'acceptedCompletedWorkVertexIds',
  );
  if (
    acceptedCompletedWorkVertexIds !== undefined &&
    (acceptedCompletedWorkVertexIds === null ||
      typeof acceptedCompletedWorkVertexIds !== 'object' ||
      typeof Reflect.get(acceptedCompletedWorkVertexIds, Symbol.iterator) !==
        'function' ||
      typeof Reflect.get(acceptedCompletedWorkVertexIds, 'has') !== 'function')
  )
    throw new TypeError('acceptedCompletedWorkVertexIds must be a set');
  for (const key of ['treeDiscoverySource', 'dagDiscoverySource']) {
    const source: unknown = Reflect.get(options, key);
    if (
      source !== undefined &&
      (source === null ||
        (typeof source !== 'object' && typeof source !== 'function') ||
        typeof Reflect.get(source, 'resolveRootVertex') !== 'function' ||
        typeof Reflect.get(
          source,
          key === 'treeDiscoverySource'
            ? 'resolveChildVertexFromHint'
            : 'resolveChildHint',
        ) !== 'function')
    )
      throw new TypeError(
        `${key} requires resolveRootVertex and ${
          key === 'treeDiscoverySource'
            ? 'resolveChildVertexFromHint'
            : 'resolveChildHint'
        }`,
      );
  }
}

/** Raw runner state is an internal protocol, never a public configuration patch. */
export function assertPublicOptions(
  options: object,
  keys: readonly string[],
): void {
  assertOwnKeys(options, keys);
}

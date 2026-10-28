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
  'traversableTree',
  'sortChildrenHints',
  'visitors',
  'retainOriginalTreeStructure',
] as const;
export const DAG_OPTION_KEYS = [
  'traversableTree',
  'traversableGraph',
  'sortChildrenHints',
  'visitors',
  'retainOriginalGraphStructure',
  'workCompletion',
  'discovery',
  'rootWorkDependencies',
  'omittedWorkDependencies',
  'syntheticRoot',
  'completedWork',
] as const;
export const OBJECT_SOURCE_OPTION_KEYS = [
  'getChildrenOfProperty',
  'getRootPropertyFromInputObject',
  'resolveChildHook',
] as const;
export const OBJECT_MUTATION_OPTION_KEYS = [
  'arrayIndexPolicy',
  'propertyCollision',
  'isArray',
  'isObject',
  'assembleArray',
  'assembleObject',
  'assembledMap',
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
  // Every requested key is copied with its original value; Pick describes that
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
    'retainOriginalTreeStructure',
    'retainOriginalGraphStructure',
    'syntheticRoot',
  ]) {
    const value: unknown = Reflect.get(options, key);
    if (value !== undefined && typeof value !== 'boolean')
      throw new TypeError(`${key} must be boolean`);
  }
  const sorter: unknown = Reflect.get(options, 'sortChildrenHints');
  if (sorter !== undefined && sorter !== null && typeof sorter !== 'function')
    throw new TypeError('sortChildrenHints must be a function or null');
  const visitors: unknown = Reflect.get(options, 'visitors');
  if (visitors !== undefined) assertOwnKeys(visitors, phases);
  const discovery: unknown = Reflect.get(options, 'discovery');
  if (discovery !== undefined && discovery !== 'lazy' && discovery !== 'eager')
    throw new TypeError('Invalid discovery policy');
  const completedWork: unknown = Reflect.get(options, 'completedWork');
  if (
    completedWork !== undefined &&
    (completedWork === null ||
      typeof completedWork !== 'object' ||
      typeof Reflect.get(completedWork, Symbol.iterator) !== 'function' ||
      typeof Reflect.get(completedWork, 'has') !== 'function')
  )
    throw new TypeError('completedWork must be a set');
  for (const key of ['traversableTree', 'traversableGraph']) {
    const source: unknown = Reflect.get(options, key);
    if (
      source !== undefined &&
      (source === null ||
        (typeof source !== 'object' && typeof source !== 'function') ||
        typeof Reflect.get(source, 'resolveRoot') !== 'function' ||
        typeof Reflect.get(source, 'resolveChild') !== 'function')
    )
      throw new TypeError(`${key} requires resolveRoot and resolveChild`);
  }
}

/** Raw runner state is an internal protocol, never a public configuration patch. */
export function assertPublicOptions(
  options: object,
  keys: readonly string[],
): void {
  assertOwnKeys(options, keys);
}

export function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return value;
  }

  const objectValue = value as object;
  if (seen.has(objectValue)) return value;
  seen.add(objectValue);

  for (const key of Reflect.ownKeys(objectValue)) {
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
    if (descriptor && 'value' in descriptor) {
      deepFreeze(descriptor.value, seen);
    }
  }

  return Object.freeze(value);
}

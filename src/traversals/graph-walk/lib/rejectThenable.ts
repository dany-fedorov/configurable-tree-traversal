/** Drain rejected promises without accepting async values in the sync family. */
export function rejectThenable(value: unknown): void {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  )
    return;
  const then = (value as { then?: unknown }).then;
  if (typeof then !== 'function') return;
  then.call(
    value,
    () => undefined,
    () => undefined,
  );
  throw new TypeError('Synchronous graph walking received a thenable');
}

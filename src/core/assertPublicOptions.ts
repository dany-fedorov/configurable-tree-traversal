/** Raw runner state is an internal protocol, never a public configuration patch. */
export function assertPublicOptions(options: object): void {
  if ('traversalRunnerInternalObjects' in options) {
    throw new TypeError('Raw runner state is not a public option');
  }
}

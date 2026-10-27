/** Raw runner state is an internal protocol, never a public configuration patch. */
export function assertPublicOptions(
  options: object,
  graphPolicies = true,
): void {
  if (
    !graphPolicies &&
    ('rootWorkDependencies' in options || 'omittedWorkDependencies' in options)
  ) {
    throw new TypeError('Dependency policies require a graph discovery source');
  }
  if ('rootDependencies' in options || 'implicitParentDependency' in options) {
    throw new TypeError('Retired dependency policy option');
  }
  if ('traversalRunnerInternalObjects' in options) {
    throw new TypeError('Raw runner state is not a public option');
  }
}

import * as root from '../src';
import * as sources from '../src/sources';

test('DAG materializers expose input envelopes and retire source-named bindings', () => {
  for (const api of [root, sources]) {
    for (const suffix of [
      'FromRecords',
      'FromRoots',
      'FromRecordsAsync',
      'FromRootsAsync',
    ]) {
      expect(typeof Reflect.get(api, 'materializeDagInput' + suffix)).toBe(
        'function',
      );
      expect(api).not.toHaveProperty('materializeDagSource' + suffix);
    }
  }
});

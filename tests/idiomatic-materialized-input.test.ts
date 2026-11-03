import * as root from '../src';
import * as sources from '../src/sources';

test('DAG materializers expose input envelopes and retire source-named bindings', () => {
  for (const api of [root, sources]) {
    for (const [publicName, retiredSuffix] of [
      ['materializeMultiEntryDagInputFromRecordCatalog', 'FromRecords'],
      ['materializeDagInputFromRootRecords', 'FromRoots'],
      [
        'materializeMultiEntryDagInputFromRecordCatalogAsync',
        'FromRecordsAsync',
      ],
      ['materializeDagInputFromRootRecordsAsync', 'FromRootsAsync'],
    ] as const) {
      expect(typeof Reflect.get(api, publicName)).toBe('function');
      expect(api).not.toHaveProperty('materializeDagSource' + retiredSuffix);
    }
  }
});

import {
  materializeDagSourceFromRecords,
  prepareDag,
} from '../src';

describe('API clarity migration', () => {
  test('materialized DAG sources create host-controlled work sessions', () => {
    const prepared = prepareDag(
      materializeDagSourceFromRecords([{ id: 'a' }], { id: (x) => x.id }),
    );
    if (prepared.kind === 'invalid') {
      throw new Error('unexpected invalid fixture');
    }
    expect(prepared.dag.createWorkSession().advance().kind).toBe(
      'awaitingSettlement',
    );
  });
});

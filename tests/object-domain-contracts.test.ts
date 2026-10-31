import { outputValue } from './helpers/rewriteOutput';
import { ObjectTreeSource, rewriteObject } from '../src';

describe('object discovery and rewrite domains', () => {
  test('preserves retained input while assembling mixed replacement arrays', () => {
    const result = rewriteObject([1, 2], {
      rewrite: (prop) =>
        prop.key === 1
          ? { kind: 'rewrite', patch: { value: 'two' } }
          : undefined,
    });
    expect(outputValue(result)).toEqual([1, 'two']);
    expect(outputValue(rewriteObject(1))).toBe(1);
  });

  test('uses both precise property adapters for root and descendant discovery', () => {
    const source = ObjectTreeSource.fromProperties(1, {
      getRootPropertyFromInputObject: (value) => ({
        key: 'root' as const,
        value,
      }),
      getChildrenOfProperty: (prop) =>
        prop.value === 1 ? [{ key: 'root', value: 2 }] : [],
    });
    expect(source.resolveRoot().vertex.vertexContent.$childHints).toEqual([
      { key: 'root', value: 2 },
    ]);
    expect(source.resolveRoot().vertex.vertexContent.$data).toEqual({
      key: 'root',
      value: 1,
    });
  });

  test('converts unknown reconstructed output with completion context', () => {
    const contexts: boolean[] = [];
    const result = rewriteObject([1, 2], {
      rewrite: (prop) =>
        prop.key === 1
          ? { kind: 'rewrite', patch: { value: 'two' } }
          : undefined,
      convertRootValue(value, context) {
        contexts.push(context.complete);
        if (!Array.isArray(value)) throw new Error('expected array');
        return value.join(',');
      },
    });
    expect(outputValue(result)).toBe('1,two');
    expect(outputValue(result)).toBe('1,two');
    expect(contexts).toEqual([true]);
  });
  test.each([
    {},
    { getChildrenOfProperty: () => [] },
    {
      getRootPropertyFromInputObject: (value: unknown) => ({
        key: 'root',
        value,
      }),
    },
  ])(
    'rejects incomplete precise adapter bags before using input',
    (options) => {
      expect(() =>
        ObjectTreeSource.fromProperties(1, options as never),
      ).toThrow(TypeError);
    },
  );

  test.each([undefined, () => 'old conversion'])(
    'rejects the removed output converter option before callbacks',
    (getOutputObjectFromRootValue) => {
      let called = false;
      expect(() =>
        rewriteObject(1, {
          getOutputObjectFromRootValue,
          rewrite: () => {
            called = true;
            return undefined;
          },
        } as never),
      ).toThrow(TypeError);
      expect(called).toBe(false);
    },
  );
});

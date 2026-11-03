import { outputValue } from './helpers/rewriteOutput';
import { ObjectPropertyTreeSource, rewriteObject } from '../src';

describe('object discovery and rewrite domains', () => {
  test('preserves retained input while assembling mixed replacement arrays', () => {
    const result = rewriteObject([1, 2], {
      rewritePropertyAfterChildTraversal: (prop) =>
        prop.propertyKey === 1
          ? { kind: "patchPropertyKeyOrValue", propertyPatch: { propertyValue: 'two' } }
          : undefined,
    });
    expect(outputValue(result)).toEqual([1, 'two']);
    expect(outputValue(rewriteObject(1))).toBe(1);
  });

  test('uses both precise property adapters for root and descendant discovery', () => {
    const source = ObjectPropertyTreeSource.fromPropertyAdapters(1, {
      mapInputToRootProperty: (value) => ({
        propertyKey: 'root' as const,
        propertyValue: value,
      }),
      enumerateChildPropertyHints: (prop) =>
        prop.propertyValue === 1 ? [{ propertyKey: 'root', propertyValue: 2 }] : [],
    });
    expect(source.resolveRootVertex().resolvedVertexInput.vertexContentInput.$childDiscoveryHints).toEqual([
      { propertyKey: 'root', propertyValue: 2 },
    ]);
    expect(source.resolveRootVertex().resolvedVertexInput.vertexContentInput.$vertexData).toEqual({
      propertyKey: 'root',
      propertyValue: 1,
    });
  });

  test('converts unknown reconstructed output with completion context', () => {
    const contexts: boolean[] = [];
    const result = rewriteObject([1, 2], {
      rewritePropertyAfterChildTraversal: (prop) =>
        prop.propertyKey === 1
          ? { kind: "patchPropertyKeyOrValue", propertyPatch: { propertyValue: 'two' } }
          : undefined,
      convertPresentRootOutputValue(value, context) {
        contexts.push(context.isTraversalFinished);
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
    { enumerateChildPropertyHints: () => [] },
    {
      mapInputToRootProperty: (value: unknown) => ({
        key: 'root',
        value,
      }),
    },
  ])(
    'rejects incomplete precise adapter bags before using input',
    (options) => {
      expect(() =>
        ObjectPropertyTreeSource.fromPropertyAdapters(1, options as never),
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

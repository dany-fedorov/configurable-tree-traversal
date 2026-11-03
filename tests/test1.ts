import { capturedOutputValue } from './helpers/rewriteOutput';
import { rewriteObject } from '@rewrite-object/rewriteObject';
import { jsonStringifySafe } from '@utils/jsonStringifySafe';

const main = () => {
  const host = {
    a: 1,
    b: 2,
    c: [1, 2, 1, 3],
    d: { d1: { d2: 'heh' }, d11: { d22: { d33: { d44: 'heh-deep' } } } },
    e: 'fef',
    f: { f1: { f2: 'heh' } },
    g: [{ g1: 123, g11: { g22: [1, 2, 3, 4, 3, 2, 1] } }],
  };
  console.log(jsonStringifySafe(host, 8));
  const outputAtReturn = capturedOutputValue(
    rewriteObject(host, {
      includeAssembledValueInRewriteInput: true,
      rewritePropertyAfterChildTraversal: ({ propertyKey: key, propertyValue: value }, options) => {
        const depth =
          options.liveResolvedTreeView.getChildDiscoveryContextOrNull(options.vertexHandle)
            ?.discoveryDepthInEdges ?? 0;
        console.log(
          depth,
          // p.map((ps) => ps.getValue().getData().key),
          options.requirePropertyKeyPathFromRoot({ includeDesignatedRoot: false }),
          // '=====>',
          // value,
          // '---->',
          // assembledComposite,
        );
        if (value === 2) {
          return {
            kind: "deletePropertySubtree",
          };
        } else if (value === 1) {
          return {
            kind: "patchPropertyKeyOrValue",
            propertyPatch: { propertyValue: 1000 },
          };
        } else if (depth % 2 === 0 && typeof key === 'string') {
          const newKey = [key, depth].join('__');
          return {
            kind: "patchPropertyKeyOrValue",
            propertyPatch: {
              propertyKey: newKey,
            },
          };
        }
        return;
      },
    }),
  );
  console.log(jsonStringifySafe(outputAtReturn, 8));
};

main();

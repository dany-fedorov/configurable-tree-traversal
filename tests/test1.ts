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
  const { outputAtReturn } = rewriteObject(host, {
    assembleCompositesBeforeRewrite: true,
    rewrite: ({ key, value }, options) => {
      const depth =
        options.resolvedTree.get(options.vertexRef)?.getResolutionContext()
          ?.depth ?? 0;
      console.log(
        depth,
        // p.map((ps) => ps.getValue().getData().key),
        options.getKeyPath({ noRoot: true }),
        // '=====>',
        // value,
        // '---->',
        // assembledComposite,
      );
      if (value === 2) {
        return {
          kind: 'delete',
        };
      } else if (value === 1) {
        return {
          kind: 'rewrite',
          patch: { value: 1000 },
        };
      } else if (depth % 2 === 0 && typeof key === 'string') {
        const newKey = [key, depth].join('__');
        return {
          kind: 'rewrite',
          patch: {
            key: newKey,
          },
        };
      }
      return;
    },
  });
  console.log(jsonStringifySafe(outputAtReturn, 8));
};

main();

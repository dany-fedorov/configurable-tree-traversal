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
  const { outputObject } = rewriteObject(host, {
    assembleCompositesBeforeRewrite: true,
    rewrite: ({ key, value }, options) => {
      const depth =
        options.resolvedTree.get(options.vertexRef)?.getResolutionContext()
          ?.depth ?? 0;
      const p = options.resolvedTree.getPathTo(options.vertexRef, {
        noRoot: true,
        // noSelf: true,
      });
      console.log(
        depth,
        // p.map((ps) => ps.unref().getData().key),
        options.getKeyPath({ noRoot: true }),
        // '=====>',
        // value,
        // '---->',
        // assembledComposite,
      );
      if (value === 2) {
        return {
          delete: true,
        };
      } else if (value === 1) {
        return {
          rewrite: { value: 1000 },
        };
      } else if (depth % 2 === 0 && typeof key === 'string') {
        const newKey = [key, depth].join('__');
        return {
          rewrite: {
            key: newKey,
          },
        };
      }
      return;
    },
  });
  console.log(jsonStringifySafe(outputObject, 8));
};

main();

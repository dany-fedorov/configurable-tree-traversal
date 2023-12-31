import { rewriteObject } from '../src/tools/rewrite-object/rewriteObject';
import { jsonStringifySafe } from '../src/utils/jsonStringifySafe';
import type { TraversableObjectProp } from '../src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObjectProp';
import type { MakeMutationCommandFunctionInput } from '../src/core/MakeMutationCommandFunctionFactory';
import type { TraversableObjectPropKey } from '../src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObjectPropKey';
import type { TraversableObject } from '../src/traversable-tree-implementations/traversable-object-tree/lib/TraversableObject';

const obj = {
  F: {
    B: {
      A: 1,
      D: { C: 1, E: 2 },
    },
    G: {
      _: null,
      I: { H: 2 },
    },
  },
};

console.log('Input');
console.log(jsonStringifySafe(obj, 2));
console.log();

const { outputObject } = rewriteObject(obj, {
  makeVertexHook: (vertexHint) => {
    if (vertexHint.value === null) {
      return { returnMe: null };
    }
    return {};
  },
  rewrite: function rewrite({ key, value }, options) {
    const depth =
      options.resolvedTree.get(options.vertexRef)?.getResolutionContext()
        ?.depth ?? 0;
    console.log(
      'depth:',
      depth,
      '; path:',
      options.getKeyPath({ noRoot: true }).join('.').padEnd(7),
      '; value:',
      jsonStringifySafe(value),
    );
    const rewriteCmd: MakeMutationCommandFunctionInput<
      Partial<
        TraversableObjectProp<
          TraversableObjectPropKey,
          TraversableObject<TraversableObjectPropKey, unknown> | unknown
        >
      >
    >['rewrite'] = {};
    if (value === 2) {
      return {
        delete: true,
      };
    }
    if (value === 1) {
      rewriteCmd.value = 1000;
    }
    if (depth % 2 === 0 && typeof key === 'string') {
      const newKey = [key, depth].join('__');
      rewriteCmd.key = newKey;
    }
    return { rewrite: rewriteCmd };
  },
});

console.log();
console.log('Output');
console.log(jsonStringifySafe(outputObject, 2));

/*
Input
{
  "F": {
  "B": {
    "A": 1,
      "D": {
      "C": 1,
        "E": 2
    }
  },
  "G": {
    "_": null,
      "I": {
      "H": 2
    }
  }
}
}

depth: 3 ; path: F.B.A   ; value: 1
depth: 4 ; path: F.B.D.C ; value: 1
depth: 4 ; path: F.B.D.E ; value: 2
depth: 3 ; path: F.B.D   ; value: {"C":1,"E":2}
depth: 2 ; path: F.B     ; value: {"A":1,"D":{"C":1,"E":2}}
depth: 4 ; path: F.G.I.H ; value: 2
depth: 3 ; path: F.G.I   ; value: {"H":2}
depth: 2 ; path: F.G     ; value: {"_":null,"I":{"H":2}}
depth: 1 ; path: F       ; value: {"B":{"A":1,"D":{"C":1,"E":2}},"G":{"_":null,"I":{"H":2}}}
depth: 0 ; path:         ; value: {"F":{"B":{"A":1,"D":{"C":1,"E":2}},"G":{"_":null,"I":{"H":2}}}}

Output
{
  "F": {
  "B__2": {
    "A": 1000,
      "D": {
      "C__4": 1000
    }
  },
  "G__2": {
    "I": {}
  }
}
}
*/

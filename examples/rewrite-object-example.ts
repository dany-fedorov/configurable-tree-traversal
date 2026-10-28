import {
  rewriteObject,
  type TraversableObjectProp,
  type MutationRequest,
  type TraversableObjectPropKey,
  type TraversableObject,
} from '../src';

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
console.log(JSON.stringify(obj, null, 2));
console.log();

const result = rewriteObject(obj, {
  convertRootValue(value, { complete }) {
    if (!complete) throw new Error('Expected the initial traversal to finish');
    return JSON.stringify(value, null, 2);
  },
  resolveVertexHook: (vertexHint) => {
    if (vertexHint.value === null) {
      return { kind: 'omitted' };
    }
    return { kind: 'useDefault' };
  },
  rewrite: function rewrite({ key, value }, options) {
    const depth =
      options.resolvedTree.getResolutionContextOf(options.vertexRef)?.depth ??
      0;
    console.log(
      'depth:',
      depth,
      '; path:',
      options.getKeyPath({ noRoot: true }).join('.').padEnd(7),
      '; value:',
      JSON.stringify(value),
    );
    const rewriteCmd: MutationRequest<
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
console.log(result.getOutput());

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

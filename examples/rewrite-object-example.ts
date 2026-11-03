import {
  rewriteObject,
  type ObjectPropertyKeyValuePatch,
  type ObjectPropertyTreeVertexTypes,
  type ObjectPropertyKey,
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
  convertPresentRootOutputValue(value, { isTraversalFinished: complete }) {
    if (!complete) throw new Error('Expected the initial traversal to finish');
    return JSON.stringify(value, null, 2);
  },
  resolveChildPropertyOrUseDefault: (vertexHint) => {
    if (vertexHint.propertyValue === null) {
      return { kind: 'vertexIntentionallyOmitted' };
    }
    return { kind: 'useDefaultChildPropertyResolution' };
  },
  rewritePropertyAfterChildTraversal: function rewrite(
    { propertyKey: key, propertyValue: value },
    options,
  ) {
    const depth =
      options.liveResolvedTreeView.getChildDiscoveryContextOrNull(
        options.vertexHandle,
      )?.discoveryDepthInEdges ?? 0;
    console.log(
      'depth:',
      depth,
      '; path:',
      options
        .requirePropertyKeyPathFromRoot({ includeDesignatedRoot: true })
        .join('.')
        .padEnd(7),
      '; value:',
      JSON.stringify(value),
    );
    const rewriteCmd: ObjectPropertyKeyValuePatch<
      ObjectPropertyTreeVertexTypes<ObjectPropertyKey, unknown>
    > = {};
    if (value === 2) {
      return {
        kind: 'deletePropertySubtree',
      };
    }
    if (value === 1) {
      rewriteCmd.propertyValue = 1000;
    }
    if (depth % 2 === 0 && typeof key === 'string') {
      const newKey = [key, depth].join('__');
      rewriteCmd.propertyKey = newKey;
    }
    return { kind: 'patchPropertyKeyOrValue', propertyPatch: rewriteCmd };
  },
});

console.log();
console.log('Output');
console.log(outputValue(result));

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

function outputValue<Out>(result: {
  getFinalOutputResult():
    | { readonly kind: 'present'; readonly value: Out }
    | { readonly kind: 'absent' };
}): Out | null {
  const output = result.getFinalOutputResult();
  return output.kind === 'present' ? output.value : null;
}

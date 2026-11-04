import { ObjectPropertyTreeSource } from '../src';
import { rewriteObject } from '../src/tools/rewrite-object/rewriteObject';
import type {
  TreeDiscoverySource,
  AsyncTreeDiscoverySource,
  DagDiscoverySource,
  VertexDataAndChildHintTypes,
  ResolvedTreeSourceVertex,
  OmittedTreeSourceVertex,
  TreeSourceVertexResolution,
  DagSourceVertexResolution,
  ObjectChildPropertyResolutionOverrideResult,
} from '../src';

type T = VertexDataAndChildHintTypes<string, string>;
const content = { $vertexData: 'root', $childDiscoveryHints: [] };
const found: ResolvedTreeSourceVertex<T> = {
  kind: 'vertexResolved',
  resolvedVertexInput: { vertexContentInput: content },
};
const omitted: OmittedTreeSourceVertex = {
  kind: 'vertexIntentionallyOmitted',
};
// @ts-expect-error Untagged tree source resolutions are retired.
const legacy: TreeSourceVertexResolution<T> = { vertexContent: null };
const source: TreeSourceVertexResolution<T> = found;
const tree: TreeDiscoverySource<T> = {
  resolveRootVertex: () => source,
  resolveChildVertexFromHint: () => omitted,
};
const asyncTree: AsyncTreeDiscoverySource<T> = {
  resolveRootVertex: async () => legacy,
  resolveChildVertexFromHint: async () => found,
};
const hook: ObjectChildPropertyResolutionOverrideResult<T> = {
  kind: 'useDefaultChildPropertyResolution',
};
const graph: DagDiscoverySource<T> = {
  resolveRootVertex: () => ({
    kind: 'vertexResolved',
    resolvedVertexInput: {
      vertexContentInput: content,
      vertexId: undefined,
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
  }),
  resolveChildVertexFromHint: () => ({
    kind: 'vertexIntentionallyOmitted',
    satisfiesWorkAndSubgraphCompletionPrerequisites: true,
    omittedVertexIdentity: { vertexId: undefined },
  }),
};
const graphResult: DagSourceVertexResolution<T> = graph.resolveRootVertex();
void [tree, asyncTree, hook, graphResult];

const vertexIdlegacy = () => ({
  kind: 'vertexResolved' as const,
  resolvedVertexInput: { vertexContentInput: content, vertexId: undefined },
});
const badvertexIdlegacy: TreeDiscoverySource<T> = {
  // @ts-expect-error vertexId is not a tree legacy capability, even on pretyped functions.
  resolveRootVertex: vertexIdlegacy,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBadvertexIdlegacy: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => vertexIdlegacy(),
  resolveChildVertexFromHint: () => omitted,
};
void [badvertexIdlegacy, asyncBadvertexIdlegacy];
const vertexIdfound = () => ({
  kind: 'vertexResolved' as const,
  resolvedVertexInput: { vertexContentInput: content, vertexId: undefined },
});
const badvertexIdfound: TreeDiscoverySource<T> = {
  // @ts-expect-error vertexId is not a tree found capability, even on pretyped functions.
  resolveRootVertex: vertexIdfound,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBadvertexIdfound: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => vertexIdfound(),
  resolveChildVertexFromHint: () => omitted,
};
void [badvertexIdfound, asyncBadvertexIdfound];
const vertexIdomitted = () => ({
  kind: 'vertexIntentionallyOmitted' as const,
  omittedVertexIdentity: { vertexId: undefined },
});
const badvertexIdomitted: TreeDiscoverySource<T> = {
  // @ts-expect-error vertexId is not a tree omitted capability, even on pretyped functions.
  resolveRootVertex: vertexIdomitted,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBadvertexIdomitted: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => vertexIdomitted(),
  resolveChildVertexFromHint: () => omitted,
};
void [badvertexIdomitted, asyncBadvertexIdomitted];
const dependsOnlegacy = () => ({
  kind: 'vertexResolved' as const,
  resolvedVertexInput: { vertexContentInput: content, workWaitsForWorkOf: [] },
});
const baddependsOnlegacy: TreeDiscoverySource<T> = {
  // @ts-expect-error dependsOnWork is not a tree legacy capability, even on pretyped functions.
  resolveRootVertex: dependsOnlegacy,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBaddependsOnlegacy: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => dependsOnlegacy(),
  resolveChildVertexFromHint: () => omitted,
};
void [baddependsOnlegacy, asyncBaddependsOnlegacy];
const dependsOnfound = () => ({
  kind: 'vertexResolved' as const,
  resolvedVertexInput: { vertexContentInput: content, workWaitsForWorkOf: [] },
});
const baddependsOnfound: TreeDiscoverySource<T> = {
  // @ts-expect-error dependsOnWork is not a tree found capability, even on pretyped functions.
  resolveRootVertex: dependsOnfound,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBaddependsOnfound: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => dependsOnfound(),
  resolveChildVertexFromHint: () => omitted,
};
void [baddependsOnfound, asyncBaddependsOnfound];
const dependsOnomitted = () => ({
  kind: 'vertexIntentionallyOmitted' as const,
  workWaitsForWorkOf: [],
});
const baddependsOnomitted: TreeDiscoverySource<T> = {
  // @ts-expect-error dependsOnWork is not a tree omitted capability, even on pretyped functions.
  resolveRootVertex: dependsOnomitted,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBaddependsOnomitted: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => dependsOnomitted(),
  resolveChildVertexFromHint: () => omitted,
};
void [baddependsOnomitted, asyncBaddependsOnomitted];
const dependsOnCompletelegacy = () => ({
  kind: 'vertexResolved' as const,
  resolvedVertexInput: {
    vertexContentInput: content,
    workWaitsForSubgraphCompletionOf: [],
  },
});
const baddependsOnCompletelegacy: TreeDiscoverySource<T> = {
  // @ts-expect-error dependsOnSubgraphCompletion is not a tree legacy capability, even on pretyped functions.
  resolveRootVertex: dependsOnCompletelegacy,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBaddependsOnCompletelegacy: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => dependsOnCompletelegacy(),
  resolveChildVertexFromHint: () => omitted,
};
void [baddependsOnCompletelegacy, asyncBaddependsOnCompletelegacy];
const dependsOnCompletefound = () => ({
  kind: 'vertexResolved' as const,
  resolvedVertexInput: {
    vertexContentInput: content,
    workWaitsForSubgraphCompletionOf: [],
  },
});
const baddependsOnCompletefound: TreeDiscoverySource<T> = {
  // @ts-expect-error dependsOnSubgraphCompletion is not a tree found capability, even on pretyped functions.
  resolveRootVertex: dependsOnCompletefound,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBaddependsOnCompletefound: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => dependsOnCompletefound(),
  resolveChildVertexFromHint: () => omitted,
};
void [baddependsOnCompletefound, asyncBaddependsOnCompletefound];
const dependsOnCompleteomitted = () => ({
  kind: 'vertexIntentionallyOmitted' as const,
  workWaitsForSubgraphCompletionOf: [],
});
const baddependsOnCompleteomitted: TreeDiscoverySource<T> = {
  // @ts-expect-error dependsOnSubgraphCompletion is not a tree omitted capability, even on pretyped functions.
  resolveRootVertex: dependsOnCompleteomitted,
  resolveChildVertexFromHint: () => omitted,
};
const asyncBaddependsOnCompleteomitted: AsyncTreeDiscoverySource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRootVertex: async () => dependsOnCompleteomitted(),
  resolveChildVertexFromHint: () => omitted,
};
void [baddependsOnCompleteomitted, asyncBaddependsOnCompleteomitted];
// @ts-expect-error Canonical hooks cannot implicitly request default resolution.
const implicitHook: ObjectChildPropertyResolutionOverrideResult<T> = undefined;
// @ts-expect-error Canonical default results cannot carry graph identity.
const graphHook: ObjectChildPropertyResolutionOverrideResult<T> = {
  kind: 'useDefaultChildPropertyResolution',
  vertexId: undefined,
};
void [implicitHook, graphHook];

// The real adapter/helper surfaces infer hook hints and enforce tagged results.
const adapter = new ObjectPropertyTreeSource(
  { a: 1 },
  {
    resolveChildPropertyOrUseDefault: (hint, options) => {
      const sameHint: typeof hint =
        options.childDiscoveryContext.childDiscoveryHint;
      return {
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexContentInput: {
            $vertexData: sameHint,
            $childDiscoveryHints: [],
          },
        },
      };
    },
  },
);
rewriteObject(
  { a: 1 },
  {
    resolveChildPropertyOrUseDefault: () => ({
      kind: 'useDefaultChildPropertyResolution',
    }),
  },
);
new ObjectPropertyTreeSource(
  { a: 1 },
  {
    // @ts-expect-error Canonical hooks require an explicit tagged result.
    resolveChildPropertyOrUseDefault: () => undefined,
  },
);
rewriteObject(
  { a: 1 },
  {
    // @ts-expect-error Canonical hooks cannot return legacy null-content results.
    resolveChildPropertyOrUseDefault: () => ({ vertexContent: null }),
  },
);
void adapter;

// Tree omission carries no milestone acknowledgement, even on pretyped callbacks.
for (const satisfiesWorkAndSubgraphCompletionPrerequisites of [
  true,
  undefined,
] as const) {
  const invalidOmission = () => ({
    omittedVertexIdentity: null,
    kind: 'vertexIntentionallyOmitted' as const,
    satisfiesWorkAndSubgraphCompletionPrerequisites,
  });
  const invalidTree: TreeDiscoverySource<T> = {
    // @ts-expect-error Trees forbid graph acknowledgement, including present undefined.
    resolveRootVertex: invalidOmission,
    resolveChildVertexFromHint: () => omitted,
  };
  const invalidAsyncTree: AsyncTreeDiscoverySource<T> = {
    // @ts-expect-error Async tree sources enforce the same restriction.
    resolveRootVertex: async () => invalidOmission(),
    resolveChildVertexFromHint: async () => omitted,
  };
  // @ts-expect-error Object hooks are tree sources too.
  const invalidHook: ObjectChildPropertyResolutionOverrideResult<T> =
    invalidOmission();
  void [invalidTree, invalidAsyncTree, invalidHook];
}
const plainHook: ObjectChildPropertyResolutionOverrideResult<T> = omitted;
const plainAsyncTree: AsyncTreeDiscoverySource<T> = {
  resolveRootVertex: async () => omitted,
  resolveChildVertexFromHint: async () => omitted,
};
// @ts-expect-error Graph omission requires explicit acknowledgement.
const invalidGraphOmission: DagSourceVertexResolution<T> = omitted;
void [plainHook, plainAsyncTree, invalidGraphOmission];

const acknowledgedTreeOmission = () => ({
  omittedVertexIdentity: null,
  kind: 'vertexIntentionallyOmitted' as const,
  satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
});
const undefinedTreeOmission = () => ({
  omittedVertexIdentity: null,
  kind: 'vertexIntentionallyOmitted' as const,
  satisfiesWorkAndSubgraphCompletionPrerequisites: undefined,
});
const acknowledgedTree: TreeDiscoverySource<T> = {
  // @ts-expect-error Literal true is forbidden metadata for a tree callback.
  resolveRootVertex: acknowledgedTreeOmission,
  resolveChildVertexFromHint: () => omitted,
};
const undefinedTree: TreeDiscoverySource<T> = {
  // @ts-expect-error Present undefined is forbidden metadata for a tree callback.
  resolveRootVertex: undefinedTreeOmission,
  resolveChildVertexFromHint: () => omitted,
};
const invalidDefaultHook = {
  kind: 'useDefaultChildPropertyResolution' as const,
  satisfiesWorkAndSubgraphCompletionPrerequisites: undefined,
};
// @ts-expect-error Default object-hook results also forbid acknowledgement metadata.
const defaultHook: ObjectChildPropertyResolutionOverrideResult<T> =
  invalidDefaultHook;
void [acknowledgedTree, undefinedTree, defaultHook];

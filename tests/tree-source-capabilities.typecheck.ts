import { ObjectTreeSource } from '../src';
import { rewriteObject } from '../src/tools/rewrite-object/rewriteObject';
import type {
  TreeSource,
  AsyncTreeSource,
  DagDiscoverySource,
  VertexTypes,
  TreeVertexFound,
  TreeVertexOmitted,
  TreeVertexResolution,
  DagVertexResolution,
  ObjectVertexHookResult,
} from '../src';

type T = VertexTypes<string, string>;
const content = { $data: 'root', $childHints: [] };
const found: TreeVertexFound<T> = {
  kind: 'found',
  vertex: { vertexContent: content },
};
const omitted: TreeVertexOmitted = { kind: 'omitted' };
// @ts-expect-error Untagged tree source resolutions are retired.
const legacy: TreeVertexResolution<T> = { vertexContent: null };
const source: TreeVertexResolution<T> = found;
const tree: TreeSource<T> = {
  resolveRoot: () => source,
  resolveChild: () => omitted,
};
const asyncTree: AsyncTreeSource<T> = {
  resolveRoot: async () => legacy,
  resolveChild: async () => found,
};
const hook: ObjectVertexHookResult<T> = { kind: 'useDefault' };
const graph: DagDiscoverySource<T> = {
  resolveRoot: () => ({
    kind: 'found',
    vertex: {
      vertexContent: content,
      vertexId: undefined,
      dependsOnWork: [],
      dependsOnSubgraphCompletion: [],
    },
  }),
  resolveChild: () => ({
    kind: 'omitted',
    satisfiesDependencies: true,
    vertexId: undefined,
  }),
};
const graphResult: DagVertexResolution<T> = graph.resolveRoot();
void [tree, asyncTree, hook, graphResult];

const vertexIdlegacy = () => ({
  kind: 'found' as const,
  vertex: { vertexContent: content, vertexId: undefined },
});
const badvertexIdlegacy: TreeSource<T> = {
  // @ts-expect-error vertexId is not a tree legacy capability, even on pretyped functions.
  resolveRoot: vertexIdlegacy,
  resolveChild: () => omitted,
};
const asyncBadvertexIdlegacy: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => vertexIdlegacy(),
  resolveChild: () => omitted,
};
void [badvertexIdlegacy, asyncBadvertexIdlegacy];
const vertexIdfound = () => ({
  kind: 'found' as const,
  vertex: { vertexContent: content, vertexId: undefined },
});
const badvertexIdfound: TreeSource<T> = {
  // @ts-expect-error vertexId is not a tree found capability, even on pretyped functions.
  resolveRoot: vertexIdfound,
  resolveChild: () => omitted,
};
const asyncBadvertexIdfound: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => vertexIdfound(),
  resolveChild: () => omitted,
};
void [badvertexIdfound, asyncBadvertexIdfound];
const vertexIdomitted = () => ({
  kind: 'omitted' as const,
  vertexId: undefined,
});
const badvertexIdomitted: TreeSource<T> = {
  // @ts-expect-error vertexId is not a tree omitted capability, even on pretyped functions.
  resolveRoot: vertexIdomitted,
  resolveChild: () => omitted,
};
const asyncBadvertexIdomitted: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => vertexIdomitted(),
  resolveChild: () => omitted,
};
void [badvertexIdomitted, asyncBadvertexIdomitted];
const dependsOnlegacy = () => ({
  kind: 'found' as const,
  vertex: { vertexContent: content, dependsOnWork: [] },
});
const baddependsOnlegacy: TreeSource<T> = {
  // @ts-expect-error dependsOnWork is not a tree legacy capability, even on pretyped functions.
  resolveRoot: dependsOnlegacy,
  resolveChild: () => omitted,
};
const asyncBaddependsOnlegacy: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => dependsOnlegacy(),
  resolveChild: () => omitted,
};
void [baddependsOnlegacy, asyncBaddependsOnlegacy];
const dependsOnfound = () => ({
  kind: 'found' as const,
  vertex: { vertexContent: content, dependsOnWork: [] },
});
const baddependsOnfound: TreeSource<T> = {
  // @ts-expect-error dependsOnWork is not a tree found capability, even on pretyped functions.
  resolveRoot: dependsOnfound,
  resolveChild: () => omitted,
};
const asyncBaddependsOnfound: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => dependsOnfound(),
  resolveChild: () => omitted,
};
void [baddependsOnfound, asyncBaddependsOnfound];
const dependsOnomitted = () => ({
  kind: 'omitted' as const,
  dependsOnWork: [],
});
const baddependsOnomitted: TreeSource<T> = {
  // @ts-expect-error dependsOnWork is not a tree omitted capability, even on pretyped functions.
  resolveRoot: dependsOnomitted,
  resolveChild: () => omitted,
};
const asyncBaddependsOnomitted: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => dependsOnomitted(),
  resolveChild: () => omitted,
};
void [baddependsOnomitted, asyncBaddependsOnomitted];
const dependsOnCompletelegacy = () => ({
  kind: 'found' as const,
  vertex: {
    vertexContent: content,
    dependsOnSubgraphCompletion: [],
  },
});
const baddependsOnCompletelegacy: TreeSource<T> = {
  // @ts-expect-error dependsOnSubgraphCompletion is not a tree legacy capability, even on pretyped functions.
  resolveRoot: dependsOnCompletelegacy,
  resolveChild: () => omitted,
};
const asyncBaddependsOnCompletelegacy: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => dependsOnCompletelegacy(),
  resolveChild: () => omitted,
};
void [baddependsOnCompletelegacy, asyncBaddependsOnCompletelegacy];
const dependsOnCompletefound = () => ({
  kind: 'found' as const,
  vertex: { vertexContent: content, dependsOnSubgraphCompletion: [] },
});
const baddependsOnCompletefound: TreeSource<T> = {
  // @ts-expect-error dependsOnSubgraphCompletion is not a tree found capability, even on pretyped functions.
  resolveRoot: dependsOnCompletefound,
  resolveChild: () => omitted,
};
const asyncBaddependsOnCompletefound: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => dependsOnCompletefound(),
  resolveChild: () => omitted,
};
void [baddependsOnCompletefound, asyncBaddependsOnCompletefound];
const dependsOnCompleteomitted = () => ({
  kind: 'omitted' as const,
  dependsOnSubgraphCompletion: [],
});
const baddependsOnCompleteomitted: TreeSource<T> = {
  // @ts-expect-error dependsOnSubgraphCompletion is not a tree omitted capability, even on pretyped functions.
  resolveRoot: dependsOnCompleteomitted,
  resolveChild: () => omitted,
};
const asyncBaddependsOnCompleteomitted: AsyncTreeSource<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  resolveRoot: async () => dependsOnCompleteomitted(),
  resolveChild: () => omitted,
};
void [baddependsOnCompleteomitted, asyncBaddependsOnCompleteomitted];
// @ts-expect-error Canonical hooks cannot implicitly request default resolution.
const implicitHook: ObjectVertexHookResult<T> = undefined;
// @ts-expect-error Canonical default results cannot carry graph identity.
const graphHook: ObjectVertexHookResult<T> = {
  kind: 'useDefault',
  vertexId: undefined,
};
void [implicitHook, graphHook];

// The real adapter/helper surfaces infer hook hints and enforce tagged results.
const adapter = new ObjectTreeSource(
  { a: 1 },
  {
    resolveVertexHook: (hint, options) => {
      const sameHint: typeof hint = options.resolutionContext.vertexHint;
      return {
        kind: 'found',
        vertex: { vertexContent: { $data: sameHint, $childHints: [] } },
      };
    },
  },
);
rewriteObject({ a: 1 }, { resolveVertexHook: () => ({ kind: 'useDefault' }) });
new ObjectTreeSource(
  { a: 1 },
  {
    // @ts-expect-error Canonical hooks require an explicit tagged result.
    resolveVertexHook: () => undefined,
  },
);
rewriteObject(
  { a: 1 },
  {
    // @ts-expect-error Canonical hooks cannot return legacy null-content results.
    resolveVertexHook: () => ({ vertexContent: null }),
  },
);
void adapter;

// Tree omission carries no milestone acknowledgement, even on pretyped callbacks.
for (const satisfiesDependencies of [true, undefined] as const) {
  const invalidOmission = () => ({
    kind: 'omitted' as const,
    satisfiesDependencies,
  });
  const invalidTree: TreeSource<T> = {
    // @ts-expect-error Trees forbid graph acknowledgement, including present undefined.
    resolveRoot: invalidOmission,
    resolveChild: () => omitted,
  };
  const invalidAsyncTree: AsyncTreeSource<T> = {
    // @ts-expect-error Async tree sources enforce the same restriction.
    resolveRoot: async () => invalidOmission(),
    resolveChild: async () => omitted,
  };
  // @ts-expect-error Object hooks are tree sources too.
  const invalidHook: ObjectVertexHookResult<T> = invalidOmission();
  void [invalidTree, invalidAsyncTree, invalidHook];
}
const plainHook: ObjectVertexHookResult<T> = omitted;
const plainAsyncTree: AsyncTreeSource<T> = {
  resolveRoot: async () => omitted,
  resolveChild: async () => omitted,
};
// @ts-expect-error Graph omission requires explicit acknowledgement.
const invalidGraphOmission: DagVertexResolution<T> = omitted;
void [plainHook, plainAsyncTree, invalidGraphOmission];

const acknowledgedTreeOmission = () => ({
  kind: 'omitted' as const,
  satisfiesDependencies: true as const,
});
const undefinedTreeOmission = () => ({
  kind: 'omitted' as const,
  satisfiesDependencies: undefined,
});
const acknowledgedTree: TreeSource<T> = {
  // @ts-expect-error Literal true is forbidden metadata for a tree callback.
  resolveRoot: acknowledgedTreeOmission,
  resolveChild: () => omitted,
};
const undefinedTree: TreeSource<T> = {
  // @ts-expect-error Present undefined is forbidden metadata for a tree callback.
  resolveRoot: undefinedTreeOmission,
  resolveChild: () => omitted,
};
const invalidDefaultHook = {
  kind: 'useDefault' as const,
  satisfiesDependencies: undefined,
};
// @ts-expect-error Default object-hook results also forbid acknowledgement metadata.
const defaultHook: ObjectVertexHookResult<T> = invalidDefaultHook;
void [acknowledgedTree, undefinedTree, defaultHook];

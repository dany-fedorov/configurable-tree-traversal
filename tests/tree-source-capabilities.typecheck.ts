import { TraversableObjectTree } from '../src';
import { rewriteObject } from '../src/tools/rewrite-object/rewriteObject';
import type {
  TraversableTree,
  AsyncTraversableTree,
  TraversableGraph,
  TreeTypeParameters,
  MakeTreeVertexResult,
  TreeFoundVertexResult,
  TreeOmittedVertexResult,
  TreeSourceVertexResult,
  SourceVertexResult,
  ObjectVertexHookResult,
} from '../src';

type T = TreeTypeParameters<string, string>;
const content = { $data: 'root', $childHints: [] };
const found: TreeFoundVertexResult<T> = {
  kind: 'found',
  vertex: { vertexContent: content },
};
const omitted: TreeOmittedVertexResult = { kind: 'omitted' };
const legacy: MakeTreeVertexResult<T> = { vertexContent: null };
const source: TreeSourceVertexResult<T> = found;
const tree: TraversableTree<T> = {
  makeRoot: () => source,
  makeVertex: () => omitted,
};
const asyncTree: AsyncTraversableTree<T> = {
  makeRoot: async () => legacy,
  makeVertex: async () => found,
};
const hook: ObjectVertexHookResult<T> = { kind: 'useDefault' };
const graph: TraversableGraph<T> = {
  makeRoot: () => ({
    kind: 'found',
    vertex: {
      vertexContent: content,
      vertexId: undefined,
      dependsOn: [],
      dependsOnComplete: [],
    },
  }),
  makeVertex: () => ({
    kind: 'omitted',
    satisfiesDependencies: true,
    vertexId: undefined,
  }),
};
const graphResult: SourceVertexResult<T> = graph.makeRoot();
void [tree, asyncTree, hook, graphResult];

const vertexIdlegacy = () => ({ vertexContent: content, vertexId: undefined });
const badvertexIdlegacy: TraversableTree<T> = {
  // @ts-expect-error vertexId is not a tree legacy capability, even on pretyped functions.
  makeRoot: vertexIdlegacy,
  makeVertex: () => omitted,
};
const asyncBadvertexIdlegacy: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => vertexIdlegacy(),
  makeVertex: () => omitted,
};
void [badvertexIdlegacy, asyncBadvertexIdlegacy];
const vertexIdfound = () => ({
  kind: 'found' as const,
  vertex: { vertexContent: content, vertexId: undefined },
});
const badvertexIdfound: TraversableTree<T> = {
  // @ts-expect-error vertexId is not a tree found capability, even on pretyped functions.
  makeRoot: vertexIdfound,
  makeVertex: () => omitted,
};
const asyncBadvertexIdfound: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => vertexIdfound(),
  makeVertex: () => omitted,
};
void [badvertexIdfound, asyncBadvertexIdfound];
const vertexIdomitted = () => ({
  kind: 'omitted' as const,
  vertexId: undefined,
});
const badvertexIdomitted: TraversableTree<T> = {
  // @ts-expect-error vertexId is not a tree omitted capability, even on pretyped functions.
  makeRoot: vertexIdomitted,
  makeVertex: () => omitted,
};
const asyncBadvertexIdomitted: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => vertexIdomitted(),
  makeVertex: () => omitted,
};
void [badvertexIdomitted, asyncBadvertexIdomitted];
const dependsOnlegacy = () => ({ vertexContent: content, dependsOn: [] });
const baddependsOnlegacy: TraversableTree<T> = {
  // @ts-expect-error dependsOn is not a tree legacy capability, even on pretyped functions.
  makeRoot: dependsOnlegacy,
  makeVertex: () => omitted,
};
const asyncBaddependsOnlegacy: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => dependsOnlegacy(),
  makeVertex: () => omitted,
};
void [baddependsOnlegacy, asyncBaddependsOnlegacy];
const dependsOnfound = () => ({
  kind: 'found' as const,
  vertex: { vertexContent: content, dependsOn: [] },
});
const baddependsOnfound: TraversableTree<T> = {
  // @ts-expect-error dependsOn is not a tree found capability, even on pretyped functions.
  makeRoot: dependsOnfound,
  makeVertex: () => omitted,
};
const asyncBaddependsOnfound: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => dependsOnfound(),
  makeVertex: () => omitted,
};
void [baddependsOnfound, asyncBaddependsOnfound];
const dependsOnomitted = () => ({
  kind: 'omitted' as const,
  dependsOn: [],
});
const baddependsOnomitted: TraversableTree<T> = {
  // @ts-expect-error dependsOn is not a tree omitted capability, even on pretyped functions.
  makeRoot: dependsOnomitted,
  makeVertex: () => omitted,
};
const asyncBaddependsOnomitted: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => dependsOnomitted(),
  makeVertex: () => omitted,
};
void [baddependsOnomitted, asyncBaddependsOnomitted];
const dependsOnCompletelegacy = () => ({
  vertexContent: content,
  dependsOnComplete: [],
});
const baddependsOnCompletelegacy: TraversableTree<T> = {
  // @ts-expect-error dependsOnComplete is not a tree legacy capability, even on pretyped functions.
  makeRoot: dependsOnCompletelegacy,
  makeVertex: () => omitted,
};
const asyncBaddependsOnCompletelegacy: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => dependsOnCompletelegacy(),
  makeVertex: () => omitted,
};
void [baddependsOnCompletelegacy, asyncBaddependsOnCompletelegacy];
const dependsOnCompletefound = () => ({
  kind: 'found' as const,
  vertex: { vertexContent: content, dependsOnComplete: [] },
});
const baddependsOnCompletefound: TraversableTree<T> = {
  // @ts-expect-error dependsOnComplete is not a tree found capability, even on pretyped functions.
  makeRoot: dependsOnCompletefound,
  makeVertex: () => omitted,
};
const asyncBaddependsOnCompletefound: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => dependsOnCompletefound(),
  makeVertex: () => omitted,
};
void [baddependsOnCompletefound, asyncBaddependsOnCompletefound];
const dependsOnCompleteomitted = () => ({
  kind: 'omitted' as const,
  dependsOnComplete: [],
});
const baddependsOnCompleteomitted: TraversableTree<T> = {
  // @ts-expect-error dependsOnComplete is not a tree omitted capability, even on pretyped functions.
  makeRoot: dependsOnCompleteomitted,
  makeVertex: () => omitted,
};
const asyncBaddependsOnCompleteomitted: AsyncTraversableTree<T> = {
  // @ts-expect-error Async sources share the tree capability restrictions.
  makeRoot: async () => dependsOnCompleteomitted(),
  makeVertex: () => omitted,
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
const adapter = new TraversableObjectTree(
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
new TraversableObjectTree(
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
  const invalidTree: TraversableTree<T> = {
    // @ts-expect-error Trees forbid graph acknowledgement, including present undefined.
    makeRoot: invalidOmission,
    makeVertex: () => omitted,
  };
  const invalidAsyncTree: AsyncTraversableTree<T> = {
    // @ts-expect-error Async tree sources enforce the same restriction.
    makeRoot: async () => invalidOmission(),
    makeVertex: async () => omitted,
  };
  // @ts-expect-error Object hooks are tree sources too.
  const invalidHook: ObjectVertexHookResult<T> = invalidOmission();
  void [invalidTree, invalidAsyncTree, invalidHook];
}
const plainHook: ObjectVertexHookResult<T> = omitted;
const plainAsyncTree: AsyncTraversableTree<T> = {
  makeRoot: async () => omitted,
  makeVertex: async () => omitted,
};
// @ts-expect-error Graph omission requires explicit acknowledgement.
const invalidGraphOmission: SourceVertexResult<T> = omitted;
void [plainHook, plainAsyncTree, invalidGraphOmission];

const acknowledgedTreeOmission = () => ({
  kind: 'omitted' as const,
  satisfiesDependencies: true as const,
});
const undefinedTreeOmission = () => ({
  kind: 'omitted' as const,
  satisfiesDependencies: undefined,
});
const acknowledgedTree: TraversableTree<T> = {
  // @ts-expect-error Literal true is forbidden metadata for a tree callback.
  makeRoot: acknowledgedTreeOmission,
  makeVertex: () => omitted,
};
const undefinedTree: TraversableTree<T> = {
  // @ts-expect-error Present undefined is forbidden metadata for a tree callback.
  makeRoot: undefinedTreeOmission,
  makeVertex: () => omitted,
};
const invalidDefaultHook = {
  kind: 'useDefault' as const,
  satisfiesDependencies: undefined,
};
// @ts-expect-error Default object-hook results also forbid acknowledgement metadata.
const defaultHook: ObjectVertexHookResult<T> = invalidDefaultHook;
void [acknowledgedTree, undefinedTree, defaultHook];

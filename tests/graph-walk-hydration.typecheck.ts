import type {
  GraphWalkDiscoverySource,
  AsyncGraphWalkDiscoverySource,
  GraphWalkRecordMaterializationOptions,
  AsyncGraphWalkRecordMaterializationOptions,
  GraphWalkCatalogOutgoingLinkToVertexId,
  GraphWalkOutgoingLink,
} from '../src';
import type {
  GraphWalkRecordMaterializationOptions as FamilySelectors,
  AsyncGraphWalkRecordMaterializationOptions as FamilyAsyncSelectors,
  GraphWalkCatalogOutgoingLinkToVertexId as FamilyCatalogLink,
} from '../src/traversals/graph-walk';
import {
  materializeGraphWalkSourceFromVertexRecords,
  materializeSynchronousGraphWalkSourceFromAsyncRecords,
  GraphWalkBuilder,
} from '../src';

type Source = GraphWalkDiscoverySource<string, number, symbol>;
const id = Symbol('id');
const inline: Source = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
  enumerateRootTargets: () => [
    {
      kind: 'inlineResolution',
      vertexId: id,
      resolutionIfNotPreviouslyAdmitted: { kind: 'found', vertexData: 'root' },
    },
  ],
  enumerateOutgoingLinks: () => [
    {
      targetToResolveOnAdmission: {
        kind: 'previouslyAdmittedVertex',
        vertexId: id,
      },
      edgeData: 1,
    },
  ],
};
const resolver: Source = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution',
  enumerateRootTargets: () => [
    { vertexId: id },
    { vertexId: id, resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' } },
  ],
  resolveVertexDataById: () => ({ kind: 'found', vertexData: 'root' }),
  enumerateOutgoingLinks: () => [],
};
// Explicit undefined and getters yielding undefined both mean no resolver.
const undefinedResolver: Source = {
  ...inline,
  resolveVertexDataById: undefined,
};
const undefinedGetterResolver: Source = {
  ...inline,
  get resolveVertexDataById(): undefined {
    return undefined;
  },
};
const asyncUndefinedResolver: AsyncGraphWalkDiscoverySource<
  string,
  number,
  symbol
> = undefinedResolver;
const asyncUndefinedGetterResolver: AsyncGraphWalkDiscoverySource<
  string,
  number,
  symbol
> = undefinedGetterResolver;
void [asyncUndefinedResolver, asyncUndefinedGetterResolver];
// @ts-expect-error Resolver mode requires a resolver.
const missingResolver: Source = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution',
  enumerateRootTargets: () => [],
  enumerateOutgoingLinks: () => [],
};
// @ts-expect-error A no-resolver source forbids a resolver.
const forbiddenResolver: Source = {
  ...inline,
  resolveVertexDataById: () => ({ kind: 'omitted' }),
};
// @ts-expect-error Hydration is required even with fully inline roots.
const missingMode: Source = {
  enumerateRootTargets: inline.enumerateRootTargets,
  enumerateOutgoingLinks: inline.enumerateOutgoingLinks,
};
// @ts-expect-error Inline-or-cached sources require explicit target tags.
const untagged: Source = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
  enumerateRootTargets: () => [{ vertexId: id }],
  enumerateOutgoingLinks: () => [],
};
// @ts-expect-error Inline targets require a resolution.
const unresolvedInline: Source = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
  enumerateRootTargets: () => [{ kind: 'inlineResolution', vertexId: id }],
  enumerateOutgoingLinks: () => [],
};
const resolvingCached: Source = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
  // @ts-expect-error Cached targets cannot carry hydration.
  enumerateRootTargets: () => [
    {
      kind: 'previouslyAdmittedVertex',
      vertexId: id,
      resolutionIfNotPreviouslyAdmitted: { kind: 'omitted' },
    },
  ],
  enumerateOutgoingLinks: () => [],
};
const asyncInline: AsyncGraphWalkDiscoverySource<string, number, symbol> = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex',
  enumerateRootTargets: async () =>
    (async function* () {
      yield {
        kind: 'inlineResolution' as const,
        vertexId: id,
        resolutionIfNotPreviouslyAdmitted: {
          kind: 'found' as const,
          vertexData: 'root',
        },
      };
    })(),
  enumerateOutgoingLinks: async function* () {
    yield {
      targetToResolveOnAdmission: {
        kind: 'previouslyAdmittedVertex' as const,
        vertexId: id,
      },
      edgeData: 1,
    };
  },
};
// @ts-expect-error Async resolver mode also requires resolveVertex.
const asyncMissingResolver: AsyncGraphWalkDiscoverySource<
  string,
  number,
  symbol
> = {
  vertexResolutionMode: 'resolverWithOptionalInlineResolution',
  enumerateRootTargets: async () => [],
  enumerateOutgoingLinks: async () => [],
};
// @ts-expect-error Async no-resolver mode also forbids resolveVertex.
const asyncForbiddenResolver: AsyncGraphWalkDiscoverySource<
  string,
  number,
  symbol
> = {
  ...asyncInline,
  resolveVertexDataById: async () => ({ kind: 'omitted' }),
};

const link: GraphWalkCatalogOutgoingLinkToVertexId<number, symbol> = {
  toVertexId: id,
  edgeData: 1,
};
// @ts-expect-error Catalog endpoints are readonly.
link.toVertexId = id;
// @ts-expect-error Catalog data fields are readonly.
link.edgeData = 2;
// @ts-expect-error Catalog links are distinct from lazy walking links with target wrappers.
const lazy: GraphWalkOutgoingLink<string, number, symbol> = link;
const selectors: GraphWalkRecordMaterializationOptions<string, number, symbol> =
  {
    getVertexId: () => id,
    enumerateOutgoingLinks: () => [link],
    rootVertexIds: [id],
  };
const family: FamilySelectors<string, number, symbol> = selectors;
const asyncSelectors: AsyncGraphWalkRecordMaterializationOptions<
  string,
  number,
  symbol
> = {
  getVertexId: async () => id,
  enumerateOutgoingLinks: async function* () {
    yield link;
  },
  rootVertexIds: [id],
};
const familyAsync: FamilyAsyncSelectors<string, number, symbol> =
  asyncSelectors;
const familyLink: FamilyCatalogLink<number, symbol> = link;
const materialized = materializeGraphWalkSourceFromVertexRecords(
  ['root'],
  selectors,
);
const mode: 'resolverWithOptionalInlineResolution' =
  materialized.vertexResolutionMode;
materialized.resolveVertexDataById(id);
materializeSynchronousGraphWalkSourceFromAsyncRecords(
  ['root'],
  asyncSelectors,
).then((source) => {
  const vertexResolutionMode: 'resolverWithOptionalInlineResolution' =
    source.vertexResolutionMode;
  const result: import('../src').GraphWalkVertexResolutionResult<string> =
    source.resolveVertexDataById(id);
  new GraphWalkBuilder({ graphWalkDiscoverySource: source });
  void [vertexResolutionMode, result];
});
void [
  resolver,
  missingResolver,
  forbiddenResolver,
  missingMode,
  untagged,
  unresolvedInline,
  resolvingCached,
  asyncMissingResolver,
  asyncForbiddenResolver,
  lazy,
  family,
  familyAsync,
  familyLink,
  mode,
];

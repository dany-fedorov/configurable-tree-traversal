import type {
  GraphWalkSource,
  AsyncGraphWalkSource,
  GraphWalkRecordSelectors,
  AsyncGraphWalkRecordSelectors,
  GraphWalkCatalogLink,
  GraphWalkLink,
} from '../src';
import type {
  GraphWalkRecordSelectors as FamilySelectors,
  AsyncGraphWalkRecordSelectors as FamilyAsyncSelectors,
  GraphWalkCatalogLink as FamilyCatalogLink,
} from '../src/traversals/graph-walk';
import {
  materializeWalkSourceFromRecords,
  materializeWalkSourceFromRecordsAsync,
  GraphWalk,
} from '../src';

type Source = GraphWalkSource<string, number, symbol>;
const id = Symbol('id');
const inline: Source = {
  hydration: 'inlineOrCached',
  roots: () => [
    {
      kind: 'inline',
      vertexId: id,
      resolution: { kind: 'found', data: 'root' },
    },
  ],
  outgoing: () => [{ target: { kind: 'cached', vertexId: id }, data: 1 }],
};
const resolver: Source = {
  hydration: 'resolver',
  roots: () => [
    { vertexId: id },
    { vertexId: id, resolution: { kind: 'omitted' } },
  ],
  resolveVertex: () => ({ kind: 'found', data: 'root' }),
  outgoing: () => [],
};
// Explicit undefined and getters yielding undefined both mean no resolver.
const undefinedResolver: Source = { ...inline, resolveVertex: undefined };
const undefinedGetterResolver: Source = {
  ...inline,
  get resolveVertex(): undefined {
    return undefined;
  },
};
const asyncUndefinedResolver: AsyncGraphWalkSource<string, number, symbol> =
  undefinedResolver;
const asyncUndefinedGetterResolver: AsyncGraphWalkSource<
  string,
  number,
  symbol
> = undefinedGetterResolver;
void [asyncUndefinedResolver, asyncUndefinedGetterResolver];
// @ts-expect-error Resolver mode requires a resolver.
const missingResolver: Source = {
  hydration: 'resolver',
  roots: () => [],
  outgoing: () => [],
};
// @ts-expect-error A no-resolver source forbids a resolver.
const forbiddenResolver: Source = {
  ...inline,
  resolveVertex: () => ({ kind: 'omitted' }),
};
// @ts-expect-error Hydration is required even with fully inline roots.
const missingMode: Source = { roots: inline.roots, outgoing: inline.outgoing };
// @ts-expect-error Inline-or-cached sources require explicit target tags.
const untagged: Source = {
  hydration: 'inlineOrCached',
  roots: () => [{ vertexId: id }],
  outgoing: () => [],
};
// @ts-expect-error Inline targets require a resolution.
const unresolvedInline: Source = {
  hydration: 'inlineOrCached',
  roots: () => [{ kind: 'inline', vertexId: id }],
  outgoing: () => [],
};
const resolvingCached: Source = {
  hydration: 'inlineOrCached',
  // @ts-expect-error Cached targets cannot carry hydration.
  roots: () => [
    { kind: 'cached', vertexId: id, resolution: { kind: 'omitted' } },
  ],
  outgoing: () => [],
};
const asyncInline: AsyncGraphWalkSource<string, number, symbol> = {
  hydration: 'inlineOrCached',
  roots: async () =>
    (async function* () {
      yield {
        kind: 'inline' as const,
        vertexId: id,
        resolution: { kind: 'found' as const, data: 'root' },
      };
    })(),
  outgoing: async function* () {
    yield { target: { kind: 'cached' as const, vertexId: id }, data: 1 };
  },
};
// @ts-expect-error Async resolver mode also requires resolveVertex.
const asyncMissingResolver: AsyncGraphWalkSource<string, number, symbol> = {
  hydration: 'resolver',
  roots: async () => [],
  outgoing: async () => [],
};
// @ts-expect-error Async no-resolver mode also forbids resolveVertex.
const asyncForbiddenResolver: AsyncGraphWalkSource<string, number, symbol> = {
  ...asyncInline,
  resolveVertex: async () => ({ kind: 'omitted' }),
};

const link: GraphWalkCatalogLink<number, symbol> = { to: id, data: 1 };
// @ts-expect-error Catalog endpoints are readonly.
link.to = id;
// @ts-expect-error Catalog data fields are readonly.
link.data = 2;
// @ts-expect-error Catalog links are distinct from lazy walking links with target wrappers.
const lazy: GraphWalkLink<string, number, symbol> = link;
const selectors: GraphWalkRecordSelectors<string, number, symbol> = {
  id: () => id,
  outgoing: () => [link],
  roots: [id],
};
const family: FamilySelectors<string, number, symbol> = selectors;
const asyncSelectors: AsyncGraphWalkRecordSelectors<string, number, symbol> = {
  id: async () => id,
  outgoing: async function* () {
    yield link;
  },
  roots: [id],
};
const familyAsync: FamilyAsyncSelectors<string, number, symbol> =
  asyncSelectors;
const familyLink: FamilyCatalogLink<number, symbol> = link;
const materialized = materializeWalkSourceFromRecords(['root'], selectors);
const mode: 'resolver' = materialized.hydration;
materialized.resolveVertex(id);
materializeWalkSourceFromRecordsAsync(['root'], asyncSelectors).then(
  (source) => {
    const hydration: 'resolver' = source.hydration;
    const result: import('../src').GraphWalkVertexResult<string> =
      source.resolveVertex(id);
    new GraphWalk({ source });
    void [hydration, result];
  },
);
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

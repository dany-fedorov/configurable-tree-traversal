import {
  DagFragmentValidationError,
  type DagDefinitionIssue,
  copyAndNormalizeDagDefinition,
  validateAndCreateDagFragment,
  mapDagFragmentIds,
  composeAndValidateDagFragments,
  type DagFragment,
  type DagCompositionOptions,
  type DagTopologyValidationResult,
} from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
type Local = 'start' | 'finish';
const definition = copyAndNormalizeDagDefinition<number, Local>({
  vertexDeclarations: [
    {
      vertexId: 'start',
      data: 1,
      childDiscoverySlots: [],
      workWaitsForWorkOf: [],
      workWaitsForSubgraphCompletionOf: [],
    },
    {
      vertexId: 'finish',
      data: 2,
      childDiscoverySlots: [],
      workWaitsForWorkOf: ['start'],
      workWaitsForSubgraphCompletionOf: [],
    },
  ],
  omittedVertexIds: [],
  entry: {
    kind: 'roots',
    entryDiscoverySlots: [
      { kind: 'vertex', vertexId: 'start' },
      { kind: 'vertex', vertexId: 'finish' },
    ],
  },
});
const fragment = validateAndCreateDagFragment(definition, {
  start: 'start',
  finish: 'finish',
});
const exact: DagFragment<number, Local, 'start' | 'finish'> = fragment;
const key: keyof typeof fragment.vertexIdsByPortName = 'start';
// @ts-expect-error Port keys stay precise.
const badKey: keyof typeof fragment.vertexIdsByPortName = 'other';
// @ts-expect-error Bad port values cannot widen the definition's ID domain.
validateAndCreateDagFragment(definition, { wrong: 'other' });
// @ts-expect-error Bad port values cannot infer an object/string union.
validateAndCreateDagFragment(definition, { wrong: {} });
const instance = mapDagFragmentIds(fragment, {
  mapId: (id) => ({ local: id }),
});
const port: { local: Local } = instance.vertexIdsByPortName.start;
// @ts-expect-error Missing mapped port.
instance.vertexIdsByPortName.other;
// @ts-expect-error Owned ports are readonly.
instance.vertexIdsByPortName.start = { local: 'start' };
const instances: DagFragment<number, { local: Local }, 'start' | 'finish'>[] = [
  instance,
];
composeAndValidateDagFragments(instances, {
  additionalWorkPrerequisites: [
    {
      dependentWorkVertexId: instance.vertexIdsByPortName.start,
      prerequisite: {
        vertexId: instance.vertexIdsByPortName.finish,
        milestone: 'subgraphCompletion',
      },
    },
  ],
});
composeAndValidateDagFragments([fragment], {
  additionalWorkPrerequisites: [
    {
      // @ts-expect-error Foreign dependent cannot widen ID from options.
      dependentWorkVertexId: 'foreign',
      prerequisite: { vertexId: 'start', milestone: 'workCompletion' },
    },
  ],
});
composeAndValidateDagFragments([fragment], {
  additionalWorkPrerequisites: [
    {
      dependentWorkVertexId: 'start',
      // @ts-expect-error Foreign prerequisite cannot widen ID from options.
      prerequisite: { vertexId: 'foreign', milestone: 'subgraphCompletion' },
    },
  ],
});
composeAndValidateDagFragments([fragment], {
  additionalStructuralChildLinks: [
    // @ts-expect-error Foreign parent cannot widen ID from options.
    { parentVertexId: 'foreign', childVertexId: 'start' },
  ],
});
composeAndValidateDagFragments([fragment], {
  additionalStructuralChildLinks: [
    // @ts-expect-error Foreign child cannot widen ID from options.
    { parentVertexId: 'start', childVertexId: 'foreign' },
  ],
});
composeAndValidateDagFragments([fragment], {
  additionalWorkPrerequisites: [
    {
      dependentWorkVertexId: 'start',
      // @ts-expect-error Milestones must be explicit W/C choices.
      prerequisite: { vertexId: 'finish', milestone: 'ready' },
    },
  ],
});
const second = validateAndCreateDagFragment(
  copyAndNormalizeDagDefinition<string, number>({
    vertexDeclarations: [
      {
        vertexId: 3,
        data: 'text',
        childDiscoverySlots: [],
        workWaitsForWorkOf: [],
        workWaitsForSubgraphCompletionOf: [],
      },
    ],
    omittedVertexIds: [],
    entry: { kind: 'root', vertexId: 3 },
  }),
  { end: 3 },
);
const union: DagTopologyValidationResult<number | string, Local | number> =
  composeAndValidateDagFragments<number | string, Local | number>(
    [fragment, second],
    {
      additionalStructuralChildLinks: [
        { parentVertexId: 'start', childVertexId: 3 },
      ],
    },
  );
const options: DagCompositionOptions<Local> = {
  additionalStructuralChildLinks: [
    { parentVertexId: 'start', childVertexId: 'finish' },
  ],
};
const same: typeof composeAndValidateDagFragments =
  dag.composeAndValidateDagFragments;
void [exact, key, badKey, port, union, options, same];

const packedDefinition: dag.DagDefinition<number, Local> = definition;
const packedInstance: dag.DagFragment<
  number,
  { local: Local },
  'start' | 'finish'
> = instance;
const validated: dag.DagTopologyValidationResult<number, Local> =
  dag.validateAndPrepareDagDefinition(packedDefinition);
void [packedInstance, validated];

const fragmentError: dag.DagFragmentValidationError<Local> =
  new DagFragmentValidationError<Local>([
    { kind: 'outsideEntryDiscoveryClosure', vertexIds: ['start'] },
  ]);
const fragmentIssues: readonly DagDefinitionIssue<Local>[] =
  fragmentError.issues;
const defaultError: DagFragmentValidationError = fragmentError;
const fragmentTypeError: TypeError = fragmentError;
// @ts-expect-error The issue collection is readonly.
fragmentError.issues.push({ kind: 'unreachable', vertexIds: ['finish'] });
// @ts-expect-error The issue collection cannot be replaced.
fragmentError.issues = [];
const invalidFragmentError = new DagFragmentValidationError<Local>([
  // @ts-expect-error Issue IDs preserve the explicitly selected domain.
  { kind: 'outsideEntryDiscoveryClosure', vertexIds: ['other'] },
]);
const fragmentIssue = fragmentError.issues[0]!;
if (fragmentIssue.kind === 'milestoneDependencyStall') {
  const id: Local =
    fragmentIssue.diagnostics.originalMilestoneConstraints[0]!
      .prerequisiteMilestone.vertexId;
  // @ts-expect-error Typed diagnostic IDs are not foreign IDs.
  const wrong: 'other' = id;
  void wrong;
} else if (fragmentIssue.kind === 'outsideEntryDiscoveryClosure') {
  const id: Local = fragmentIssue.vertexIds[0]!;
  void id;
}
void [fragmentIssues, defaultError, fragmentTypeError, invalidFragmentError];

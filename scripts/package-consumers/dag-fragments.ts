import {
  DagFragmentValidationError,
  type DagDefinitionIssue,
  defineDag,
  defineDagFragment,
  instantiateDagFragment,
  composeDag,
  type DagFragment,
  type DagFragmentInstance,
  type DagCompositionOptions,
  type PrepareDagResult,
} from 'configurable-tree-traversal';
import * as dag from 'configurable-tree-traversal/traversals/dag-traversal';
type Local = 'start' | 'finish';
const definition = defineDag<number, Local>({
  vertices: [
    {
      vertexId: 'start',
      data: 1,
      slots: [],
      dependsOn: [],
      dependsOnComplete: [],
    },
    {
      vertexId: 'finish',
      data: 2,
      slots: [],
      dependsOn: ['start'],
      dependsOnComplete: [],
    },
  ],
  omittedIds: [],
  entry: {
    kind: 'forest',
    slots: [
      { kind: 'vertex', vertexId: 'start' },
      { kind: 'vertex', vertexId: 'finish' },
    ],
  },
});
const fragment = defineDagFragment(definition, {
  start: 'start',
  finish: 'finish',
});
const exact: DagFragment<number, Local, 'start' | 'finish'> = fragment;
const key: keyof typeof fragment.ports = 'start';
// @ts-expect-error Port keys stay precise.
const badKey: keyof typeof fragment.ports = 'other';
// @ts-expect-error Bad port values cannot widen the definition's ID domain.
defineDagFragment(definition, { wrong: 'other' });
// @ts-expect-error Bad port values cannot infer an object/string union.
defineDagFragment(definition, { wrong: {} });
const instance = instantiateDagFragment(fragment, {
  mapId: (id) => ({ local: id }),
});
const port: { local: Local } = instance.ports.start;
// @ts-expect-error Missing mapped port.
instance.ports.other;
// @ts-expect-error Owned ports are readonly.
instance.ports.start = { local: 'start' };
const instances: DagFragmentInstance<
  number,
  { local: Local },
  'start' | 'finish'
>[] = [instance];
composeDag(instances, {
  dependencies: [
    {
      dependent: instance.ports.start,
      prerequisite: {
        vertexId: instance.ports.finish,
        milestone: 'completion',
      },
    },
  ],
});
composeDag([fragment], {
  dependencies: [
    {
      // @ts-expect-error Foreign dependent cannot widen ID from options.
      dependent: 'foreign',
      prerequisite: { vertexId: 'start', milestone: 'work' },
    },
  ],
});
composeDag([fragment], {
  dependencies: [
    {
      dependent: 'start',
      // @ts-expect-error Foreign prerequisite cannot widen ID from options.
      prerequisite: { vertexId: 'foreign', milestone: 'completion' },
    },
  ],
});
// @ts-expect-error Foreign parent cannot widen ID from options.
composeDag([fragment], { children: [{ parent: 'foreign', child: 'start' }] });
// @ts-expect-error Foreign child cannot widen ID from options.
composeDag([fragment], { children: [{ parent: 'start', child: 'foreign' }] });
composeDag([fragment], {
  dependencies: [
    {
      dependent: 'start',
      // @ts-expect-error Milestones must be explicit W/C choices.
      prerequisite: { vertexId: 'finish', milestone: 'ready' },
    },
  ],
});
const second = defineDagFragment(
  defineDag<string, number>({
    vertices: [
      {
        vertexId: 3,
        data: 'text',
        slots: [],
        dependsOn: [],
        dependsOnComplete: [],
      },
    ],
    omittedIds: [],
    entry: { kind: 'root', vertexId: 3 },
  }),
  { end: 3 },
);
const union: PrepareDagResult<number | string, Local | number> = composeDag<
  number | string,
  Local | number
>([fragment, second], { children: [{ parent: 'start', child: 3 }] });
const options: DagCompositionOptions<Local> = {
  children: [{ parent: 'start', child: 'finish' }],
};
const same: typeof composeDag = dag.composeDag;
void [exact, key, badKey, port, union, options, same];

const packedDefinition: dag.DagDefinition<number, Local> = definition;
const packedInstance: dag.DagFragmentInstance<
  number,
  { local: Local },
  'start' | 'finish'
> = instance;
const validated: dag.PrepareDagResult<number, Local> =
  dag.prepareDagDefinition(packedDefinition);
void [packedInstance, validated];

const fragmentError: dag.DagFragmentValidationError<Local> =
  new DagFragmentValidationError<Local>([
    { kind: 'unreachable', vertexIds: ['start'] },
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
  { kind: 'unreachable', vertexIds: ['other'] },
]);
const fragmentIssue = fragmentError.issues[0]!;
if (fragmentIssue.kind === 'milestone') {
  const id: Local = fragmentIssue.diagnostics.dependencyEdges[0]!.to.vertexId;
  // @ts-expect-error Typed diagnostic IDs are not foreign IDs.
  const wrong: 'other' = id;
  void wrong;
} else if (fragmentIssue.kind === 'unreachable') {
  const id: Local = fragmentIssue.vertexIds[0]!;
  void id;
}
void [fragmentIssues, defaultError, fragmentTypeError, invalidFragmentError];

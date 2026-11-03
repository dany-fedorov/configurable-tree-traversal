import {
  bindDagExternalWorkSession,
  DagTraversalBuilder,
  DepthFirstTreeTraversalBuilder,
  DepthFirstTreeVisitPhase,
  rewriteObject,
  TraversalVisitorCommandName,
} from '../src';

const dagDiscoverySource = {
  resolveRootVertex: () => ({
    kind: 'vertexIntentionallyOmitted' as const,
    omittedVertexIdentity: null,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
  }),
  resolveChildHint: () => ({
    kind: 'vertexIntentionallyOmitted' as const,
    omittedVertexIdentity: null,
    satisfiesWorkAndSubgraphCompletionPrerequisites: true as const,
  }),
};

test.each([
  ['arrayAssemblyIndexPolicy', 'Invalid arrayAssemblyIndexPolicy'],
  [
    'assembledPropertyKeyCollisionPolicy',
    'Invalid assembledPropertyKeyCollisionPolicy',
  ],
])('names the invalid object assembly option %s', (option, message) => {
  expect(() => rewriteObject({}, { [option]: 'invalid' } as never)).toThrow(
    message,
  );
});

test('names accepted object property patch fields', () => {
  expect(() =>
    rewriteObject(1, {
      rewritePropertyAfterChildTraversal: () => ({
        kind: 'patchPropertyKeyOrValue',
        propertyPatch: { invalid: true } as never,
      }),
    }),
  ).toThrow(
    'Object property patches accept only propertyKey and propertyValue',
  );
});

test.each([
  [
    'workCompletionPolicy',
    'workCompletionPolicy must be afterWorkReadyVisitorChain or requireExternalWorkSettlement',
  ],
  [
    'rootWorkPrerequisitePolicy',
    'rootWorkPrerequisitePolicy must be honor or ignore',
  ],
  [
    'undeclaredWorkPrerequisitePolicy',
    'undeclaredWorkPrerequisitePolicy must be none or waitForDiscoveringParentWork',
  ],
])('names the invalid DAG option %s', (option, message) => {
  expect(
    () =>
      new DagTraversalBuilder({
        dagDiscoverySource,
        [option]: 'invalid',
      } as never),
  ).toThrow(message);
});

test('names the external work settlement policy required by coordination', () => {
  const runner = new DagTraversalBuilder({
    dagDiscoverySource,
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => bindDagExternalWorkSession(runner)).toThrow(
    'DAG coordination requires workCompletionPolicy: requireExternalWorkSettlement',
  );
});

test('names the command and argument required to set phase chain state', () => {
  const runner = new DepthFirstTreeTraversalBuilder({
    treeDiscoverySource: {
      resolveRootVertex: () => ({
        kind: 'vertexResolved',
        resolvedVertexInput: {
          vertexContentInput: { $vertexData: 1, $childDiscoveryHints: [] },
        },
      }),
      resolveChildVertexFromHint: () => ({
        kind: 'vertexIntentionallyOmitted',
      }),
    },
    visitors: {
      [DepthFirstTreeVisitPhase.BEFORE_CHILD_EXPANSION]: () => ({
        commands: [
          {
            commandName:
              TraversalVisitorCommandName.SET_CURRENT_VERTEX_PHASE_CHAIN_STATE,
            commandArguments: {} as never,
          },
        ],
      }),
    },
  }).createIndependentRunnerFromCurrentOptions();
  expect(() => runner.runUntilSuspendedOrTerminal()).toThrow(
    'SET_CURRENT_VERTEX_PHASE_CHAIN_STATE requires only an own phaseChainState field',
  );
});

// Compile with exactOptionalPropertyTypes disabled, as in many consumer projects.
import {
  GraphWalkBuilder,
  AsyncGraphWalkBuilder,
  TraversalVisitorCommandName as Command,
} from 'configurable-tree-traversal';
const visitors = {
  vertexOccurrence: () => ({
    commands: [
      {
        commandName: Command.NO_OPERATION as const,
        commandArguments: undefined,
      },
      {
        commandName:
          Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY as const,
        commandArguments: undefined,
      },
    ],
  }),
};
const source = {
  vertexResolutionMode: 'inlineResolutionOrPreviouslyAdmittedVertex' as const,
  enumerateRootTargets: () => [],
  enumerateOutgoingLinks: () => [],
};
new GraphWalkBuilder({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: visitors,
});
new AsyncGraphWalkBuilder({
  graphWalkDiscoverySource: source,
  visitorsByObservationKind: visitors,
});

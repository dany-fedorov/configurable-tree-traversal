// Compile with exactOptionalPropertyTypes disabled, as in many consumer projects.
import {
  GraphWalk,
  AsyncGraphWalk,
  TraversalVisitorCommandName as Command,
} from 'configurable-tree-traversal';
const visitors = {
  vertex: () => ({
    commands: [
      { commandName: Command.NOOP as const, commandArguments: undefined },
      {
        commandName: Command.PAUSE_TRAVERSAL as const,
        commandArguments: undefined,
      },
    ],
  }),
};
const source = {
  hydration: 'inlineOrCached' as const,
  roots: () => [],
  outgoing: () => [],
};
new GraphWalk({ source, visitors });
new AsyncGraphWalk({ source, visitors });

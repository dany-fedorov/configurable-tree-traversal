import {
  TraversalVisitorCommandName as Command,
  type TraversalVisitorCommand,
} from '../src/core/TraversalVisitor';
import type { TreeTypeParameters } from '../src/core/TreeTypeParameters';

type Tree = TreeTypeParameters<number, string>;
const halt: TraversalVisitorCommand<Tree> = {
  commandName: Command.HALT_TRAVERSAL,
};
const rewrite: TraversalVisitorCommand<Tree> = {
  commandName: Command.REWRITE_VERTEX_DATA,
  commandArguments: { newData: 42 },
};
const hints: TraversalVisitorCommand<Tree> = {
  commandName: Command.REWRITE_VERTEX_HINTS_ON_PRE_ORDER,
  commandArguments: { newHints: ['child'] },
};
// @ts-expect-error Rewrite commands need their data payload.
const missingPayload: TraversalVisitorCommand<Tree> = {
  commandName: Command.REWRITE_VERTEX_DATA,
};
// @ts-expect-error A hint payload cannot be used as a data rewrite.
const wrongPayload: TraversalVisitorCommand<Tree> = {
  commandName: Command.REWRITE_VERTEX_DATA,
  commandArguments: { newHints: ['child'] },
};
// @ts-expect-error Halt commands have no payload.
const extraPayload: TraversalVisitorCommand<Tree> = {
  commandName: Command.HALT_TRAVERSAL,
  commandArguments: { newData: 42 },
};
function readData(command: TraversalVisitorCommand<Tree>): number | undefined {
  if (command.commandName === Command.REWRITE_VERTEX_DATA)
    return command.commandArguments.newData;
  return undefined;
}
void [
  halt,
  rewrite,
  hints,
  missingPayload,
  wrongPayload,
  extraPayload,
  readData,
];

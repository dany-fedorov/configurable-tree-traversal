import {
  TraversalVisitorCommandName as Command,
  type TraversalVisitorCommand,
} from '../src/core/TraversalVisitor';
import type { VertexDataAndChildHintTypes } from '../src/core/TreeTypeParameters';

type Tree = VertexDataAndChildHintTypes<number, string>;
const halt: TraversalVisitorCommand<Tree> = {
  commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
};
const rewrite: TraversalVisitorCommand<Tree> = {
  commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
  commandArguments: { replacementVertexData: 42 },
};
const hints: TraversalVisitorCommand<Tree> = {
  commandName: Command.REPLACE_CURRENT_VERTEX_CHILD_HINTS,
  commandArguments: { replacementChildHints: ['child'] },
};
// @ts-expect-error Rewrite commands need their data payload.
const missingPayload: TraversalVisitorCommand<Tree> = {
  commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
};
// @ts-expect-error A hint payload cannot be used as a data rewrite.
const wrongPayload: TraversalVisitorCommand<Tree> = {
  commandName: Command.REPLACE_CURRENT_VERTEX_DATA,
  commandArguments: { replacementChildHints: ['child'] },
};
// @ts-expect-error Halt commands have no payload.
const extraPayload: TraversalVisitorCommand<Tree> = {
  commandName: Command.PAUSE_TRAVERSAL_AT_COMMAND_COMMIT_BOUNDARY,
  commandArguments: { replacementVertexData: 42 },
};
function readData(command: TraversalVisitorCommand<Tree>): number | undefined {
  if (command.commandName === Command.REPLACE_CURRENT_VERTEX_DATA)
    return command.commandArguments.replacementVertexData;
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

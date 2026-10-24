import {
  TraversableObjectTree,
  TraversalVisitorCommandName,
  type MakeMutationCommandFunction,
  type MakeMutationCommandFunctionFactory,
  type TreeTypeParameters,
  type TraversableObjectTTP,
} from '../src';
import { makeMutationCommandFactory } from '../src/traversable-tree-implementations/traversable-object-tree';

type Input = TraversableObjectTTP<string, unknown>;
type Output = TraversableObjectTTP<string, number>;
const factory = TraversableObjectTree.makeMutationCommandFactory<
  Input,
  Output
>();
declare const args: Parameters<typeof factory>;
const { makeMutationCommand } = factory(...args);
makeMutationCommand();
makeMutationCommand({ delete: true });
makeMutationCommand({ rewrite: {} });
makeMutationCommand({ rewrite: { key: 'renamed' } });
makeMutationCommand({ rewrite: { value: 3 } });
const command = makeMutationCommand({ rewrite: { key: 'renamed', value: 3 } });
if (command.commandName === TraversalVisitorCommandName.REWRITE_VERTEX_DATA) {
  const value: number = command.commandArguments.newData.value;
  void value;
}
// @ts-expect-error The real factory-returned helper requires a numeric value.
makeMutationCommand({ rewrite: { value: 'wrong' } });
// @ts-expect-error The real factory-returned helper requires a string key.
makeMutationCommand({ rewrite: { key: 4 } });
// @ts-expect-error Null is not an object property patch.
makeMutationCommand({ rewrite: null });
// @ts-expect-error A primitive is not an object property patch.
makeMutationCommand({ rewrite: 3 });
// @ts-expect-error An absent rewrite is represented by an omitted property.
makeMutationCommand({ rewrite: undefined });
// @ts-expect-error Undefined is not a numeric output value.
makeMutationCommand({ rewrite: { value: undefined } });
const optionalFactory = makeMutationCommandFactory<
  Input,
  TraversableObjectTTP<string, number | undefined>
>();
declare const optionalArgs: Parameters<typeof optionalFactory>;
optionalFactory(...optionalArgs).makeMutationCommand({
  rewrite: { value: undefined },
});
// @ts-expect-error Object factories require object property data, not arbitrary vertex data.
makeMutationCommandFactory<TreeTypeParameters<number>, Output>();
makeMutationCommandFactory<Input, Output>({
  // @ts-expect-error Classifiers cannot narrow their accepted input data.
  isArray: (_data: { key: string; value: number }) => false,
});

declare const replace: MakeMutationCommandFunction<Output>;
replace({ rewrite: { key: 'replacement', value: 3 } });
// @ts-expect-error Generic replacement requires complete output vertex data.
replace({ rewrite: { value: 3 } });
// @ts-expect-error Generic replacement must match the output value type.
replace({ rewrite: { key: 'replacement', value: 'wrong' } });

declare const genericFactory: MakeMutationCommandFunctionFactory;
const genericVisitorFactory = genericFactory<'post', Input, Output>();
declare const genericArgs: Parameters<typeof genericVisitorFactory>;
const genericBuilder = genericVisitorFactory(
  ...genericArgs,
).makeMutationCommand;
genericBuilder({ rewrite: { key: 'replacement', value: 3 } });
// @ts-expect-error A generic factory also returns a full-replacement builder.
genericBuilder({ rewrite: { value: 3 } });

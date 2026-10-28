import {
  ObjectTreeSource,
  TraversalVisitorCommandName,
  type MutationCommandBuilder,
  type TreeMutationCommandBinderFactory,
  type VertexTypes,
  type ObjectTreeVertexTypes,
} from '../src';
import { createObjectMutationBinder } from '../src/traversable-tree-implementations/traversable-object-tree';

type Input = ObjectTreeVertexTypes<string, unknown>;
type Output = ObjectTreeVertexTypes<string, number>;
const factory = ObjectTreeSource.createObjectMutationBinder<Input, Output>();
declare const args: Parameters<typeof factory>;
const { makeMutationCommand } = factory(...args);
makeMutationCommand();
makeMutationCommand({ kind: 'delete' });
makeMutationCommand({ kind: 'rewrite', patch: {} });
makeMutationCommand({ kind: 'rewrite', patch: { key: 'renamed' } });
makeMutationCommand({ kind: 'rewrite', patch: { value: 3 } });
const command = makeMutationCommand({
  kind: 'rewrite',
  patch: { key: 'renamed', value: 3 },
});
if (command.commandName === TraversalVisitorCommandName.REWRITE_VERTEX_DATA) {
  // @ts-expect-error Partial-patch builders do not guarantee a full output record.
  const value: number = command.commandArguments.newData.value;
  void value;
}
// @ts-expect-error The real factory-returned helper requires a numeric value.
makeMutationCommand({ kind: 'rewrite', patch: { value: 'wrong' } });
// @ts-expect-error The real factory-returned helper requires a string key.
makeMutationCommand({ kind: 'rewrite', patch: { key: 4 } });
// @ts-expect-error Null is not an object property patch.
makeMutationCommand({ kind: 'rewrite', patch: null });
// @ts-expect-error A primitive is not an object property patch.
makeMutationCommand({ kind: 'rewrite', patch: 3 });
// @ts-expect-error An absent rewrite is represented by an omitted property.
makeMutationCommand({ kind: 'rewrite', patch: undefined });
// @ts-expect-error Undefined is not a numeric output value.
makeMutationCommand({ kind: 'rewrite', patch: { value: undefined } });
const optionalFactory = createObjectMutationBinder<
  Input,
  ObjectTreeVertexTypes<string, number | undefined>
>();
declare const optionalArgs: Parameters<typeof optionalFactory>;
optionalFactory(...optionalArgs).makeMutationCommand({
  kind: 'rewrite',
  patch: { value: undefined },
});
// @ts-expect-error Object factories require object property data, not arbitrary vertex data.
createObjectMutationBinder<VertexTypes<number>, Output>();
createObjectMutationBinder<Input, Output>({
  // @ts-expect-error Classifiers cannot narrow their accepted input data.
  isArray: (_data: { key: string; value: number }) => false,
});

declare const replace: MutationCommandBuilder<Output>;
replace({ kind: 'rewrite', value: { key: 'replacement', value: 3 } });
// @ts-expect-error Generic replacement requires complete output vertex data.
replace({ kind: 'rewrite', value: { value: 3 } });
// @ts-expect-error Generic replacement must match the output value type.
replace({ kind: 'rewrite', value: { key: 'replacement', value: 'wrong' } });

declare const genericFactory: TreeMutationCommandBinderFactory;
const genericVisitorFactory = genericFactory<'post', Input, Output>();
declare const genericArgs: Parameters<typeof genericVisitorFactory>;
const genericBuilder = genericVisitorFactory(
  ...genericArgs,
).makeMutationCommand;
genericBuilder({ kind: 'rewrite', value: { key: 'replacement', value: 3 } });
// @ts-expect-error A generic factory also returns a full-replacement builder.
genericBuilder({ kind: 'rewrite', value: { value: 3 } });

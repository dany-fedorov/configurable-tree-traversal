import {
  ObjectPropertyTreeSource,
  TraversalVisitorCommandName,
  type VertexDataMutationCommandBuilder,
  type TreeVisitorVertexDataMutationToolsBinderFactory,
  type VertexDataAndChildHintTypes,
  type ObjectPropertyTreeVertexTypes,
} from '../src';
import { createObjectPropertyMutationHelperBinder } from '../src/traversable-tree-implementations/traversable-object-tree';

type Input = ObjectPropertyTreeVertexTypes<string, unknown>;
type Output = ObjectPropertyTreeVertexTypes<string, number>;
const factory =
  ObjectPropertyTreeSource.createObjectPropertyMutationHelperBinder<
    Input,
    Output
  >();
declare const args: Parameters<typeof factory>;
const { createObjectPropertyMutationCommand: makeVertexDataMutationCommand } =
  factory(...args);
makeVertexDataMutationCommand();
makeVertexDataMutationCommand({ kind: 'deletePropertySubtree' });
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  propertyPatch: {},
});
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  propertyPatch: { propertyKey: 'renamed' },
});
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  propertyPatch: { propertyValue: 3 },
});
const command = makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  propertyPatch: { propertyKey: 'renamed', propertyValue: 3 },
});
if (
  command.commandName ===
  TraversalVisitorCommandName.REPLACE_CURRENT_VERTEX_DATA
) {
  // @ts-expect-error Partial-patch builders do not guarantee a full output record.
  const value: number =
    command.commandArguments.replacementVertexData.propertyValue;
  void value;
}
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  // @ts-expect-error The real factory-returned helper requires a numeric value.
  propertyPatch: { propertyValue: 'wrong' },
});
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  // @ts-expect-error The real factory-returned helper requires a string key.
  propertyPatch: { propertyKey: 4 },
});
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  // @ts-expect-error Null is not an object property patch.
  propertyPatch: null,
});
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  // @ts-expect-error A primitive is not an object property patch.
  propertyPatch: 3,
});
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  // @ts-expect-error An absent rewrite is represented by an omitted property.
  propertyPatch: undefined,
});
makeVertexDataMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  // @ts-expect-error Undefined is not a numeric output value.
  propertyPatch: { propertyValue: undefined },
});
const optionalFactory = createObjectPropertyMutationHelperBinder<
  Input,
  ObjectPropertyTreeVertexTypes<string, number | undefined>
>();
declare const optionalArgs: Parameters<typeof optionalFactory>;
optionalFactory(...optionalArgs).createObjectPropertyMutationCommand({
  kind: 'patchPropertyKeyOrValue',
  propertyPatch: { propertyValue: undefined },
});
createObjectPropertyMutationHelperBinder<
  // @ts-expect-error Object factories require object property data, not arbitrary vertex data.
  VertexDataAndChildHintTypes<number>,
  Output
>();
createObjectPropertyMutationHelperBinder<Input, Output>({
  // @ts-expect-error Classifiers cannot narrow their accepted input data.
  matchesArrayAssemblyPredicate: (_data: { key: string; value: number }) =>
    false,
});

declare const replace: VertexDataMutationCommandBuilder<Output>;
replace({
  kind: 'replaceData',
  replacementData: { propertyKey: 'replacement', propertyValue: 3 },
});
// @ts-expect-error Generic replacement requires complete output vertex data.
replace({ kind: 'replaceData', replacementData: { propertyValue: 3 } });
replace({
  kind: 'replaceData',
  // @ts-expect-error Generic replacement must match the output value type.
  replacementData: { propertyKey: 'replacement', propertyValue: 'wrong' },
});

declare const genericFactory: TreeVisitorVertexDataMutationToolsBinderFactory;
const genericVisitorFactory = genericFactory<'post', Input, Output>();
declare const genericArgs: Parameters<typeof genericVisitorFactory>;
const genericBuilder = genericVisitorFactory(
  ...genericArgs,
).makeVertexDataMutationCommand;
genericBuilder({
  kind: 'replaceData',
  replacementData: { propertyKey: 'replacement', propertyValue: 3 },
});
// @ts-expect-error A generic factory also returns a full-replacement builder.
genericBuilder({ kind: 'replaceData', replacementData: { propertyValue: 3 } });

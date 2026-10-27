import {
  rewriteObject,
  createObjectMutationBinder,
  type VertexTypes,
  type ObjectRewriteCallback,
  type ObjectRewriteInput,
  type ObjectRewriteContext,
  type ObjectTreeVertexTypes,
  type ResolvedTreeVertexTypes,
  type ObjectPropertyPatch,
  ObjectTreeSource,
} from '../src';

rewriteObject<number, string, number, unknown, symbol, string>(1, {
  rewrite(prop, context) {
    // @ts-expect-error A configured visitor can already have rewritten the value.
    const value: number = prop.value;
    // @ts-expect-error Current keys include output keys.
    const key: string = prop.key;
    // @ts-expect-error The live vertex includes rewritten output values.
    const vertexValue: number = context.vertex.getData().value;
    // @ts-expect-error The live reference includes rewritten output values.
    const refValue: number = context.vertexRef.getValue().getData().value;
    // @ts-expect-error The live tree includes rewritten output values.
    const treeValue: number = context.resolvedTree
      .getRoot()!
      .getValue()
      .getData().value;
    // @ts-expect-error Previously visited vertices can already be rewritten.
    const previousValue: number = context
      .previousPhaseVertexRef!.getValue()
      .getData().value;
    // @ts-expect-error Live paths include output keys.
    const path: string[] = context.getKeyPath();
    const originalValue: number = context
      .originalTreeView!.getRoot()!
      .getValue()
      .getData().value;
    const assembled: string | undefined = prop.assembledComposite;
    void [
      value,
      key,
      vertexValue,
      refValue,
      treeValue,
      previousValue,
      path,
      originalValue,
      assembled,
    ];
    return undefined;
  },
  isArray(prop) {
    // @ts-expect-error Classifiers inspect current input-or-output data.
    const value: number = prop.value;
    void value;
    return false;
  },
  isObject(prop) {
    // @ts-expect-error Classifiers inspect current input-or-output data.
    const value: number = prop.value;
    void value;
    return false;
  },
  assembleArray(children, prop, [vertex, context]) {
    // @ts-expect-error Assemblers inspect current input-or-output data.
    const value: number = prop.value;
    // @ts-expect-error An unchanged child can retain its input value.
    const childValue: string = children[0]!.value;
    const liveValue: string | number = vertex.getData().value;
    const pathValue: string | number = context.vertexRef
      .getValue()
      .getData().value;
    void [value, childValue, liveValue, pathValue];
    return '';
  },
  assembleObject(children, prop) {
    // @ts-expect-error An unchanged child can retain its input value.
    const childValue: string = children[0]!.value;
    void childValue;
    // @ts-expect-error Assemblers inspect current input-or-output data.
    const value: number = prop.value;
    void value;
    return '';
  },
});

type ExtendedProp = { key: string; value: number; note: string };
type Extended = VertexTypes<ExtendedProp, ExtendedProp>;
const bind = createObjectMutationBinder<Extended, Extended>();
declare const args: Parameters<typeof bind>;
// @ts-expect-error Object patches change key/value only, even for extended data.
bind(...args).makeMutationCommand({ rewrite: { note: 'new' } });

const callback: ObjectRewriteCallback<string, number, symbol, string> = (
  prop,
  context,
) => {
  const input: ObjectRewriteInput<string, number, symbol, string> = prop;
  const live: ObjectRewriteContext<string, number, symbol, string> = context;
  const key: string | symbol = input.key;
  const value: number | string = input.value;
  void [live, key, value];
  return undefined;
};
const patch: ObjectPropertyPatch<ObjectTreeVertexTypes<string, number>> = {
  value: 1,
};
declare const resolved: ResolvedTreeVertexTypes<
  ObjectTreeVertexTypes<string, number>
>;
const retainedValue: number = resolved.VertexData.getValue().getData().value;
const mapper = ObjectTreeSource.createRootPropertyMapper<
  number,
  string,
  number,
  string,
  number
>('root');
const rootValue: number = mapper(1).value;
void [callback, patch, retainedValue, rootValue];

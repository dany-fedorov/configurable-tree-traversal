import type { TreeTypeParameters } from '@core/TreeTypeParameters';
import type {
  TraversalVisitor,
  TraversalVisitorCommand,
} from '@core/TraversalVisitor';
import type { TraversalVisitorCommandName } from '@core/TraversalVisitor';

export type MakeMutationCommandFunctionInput<RW_V> = {
  rewrite?: RW_V;
  delete?: boolean;
};

export type MakeMutationCommandFunctionResult<TTP extends TreeTypeParameters> =
  TraversalVisitorCommand<
    TTP,
    | TraversalVisitorCommandName.DELETE_VERTEX
    | TraversalVisitorCommandName.REWRITE_VERTEX_DATA
    | TraversalVisitorCommandName.NOOP
  >;

export type MakeMutationCommandFactoryResult<
  OUT_TTP extends TreeTypeParameters,
> = {
  makeMutationCommand: MakeMutationCommandFunction<OUT_TTP>;
};

export type MakeMutationCommandFunction<OUT_TTP extends TreeTypeParameters> = (
  input_2?: MakeMutationCommandFunctionInput<any>,
) => MakeMutationCommandFunctionResult<OUT_TTP>;

export type MakeMutationCommandFunctionFactory_2<
  ORDER extends string,
  IN_TTP extends TreeTypeParameters,
  OUT_TTP extends TreeTypeParameters,
> = (
  ...visitorArguments: Parameters<TraversalVisitor<ORDER, IN_TTP, OUT_TTP>>
) => MakeMutationCommandFactoryResult<OUT_TTP>;

export type MakeMutationCommandFunctionFactory = <
  ORDER extends string,
  IN_TTP extends TreeTypeParameters<any, any>, // See [1]
  OUT_TTP extends TreeTypeParameters<any, any>, // See [1]
>(
  input_0?: any,
) => MakeMutationCommandFunctionFactory_2<ORDER, IN_TTP, OUT_TTP>;

/**
 * [1]
 * Setting parameters to "any" here allows to make concretions for "extends" in type parameters in function concretions.
 *
 * Like in TraversableObjectTree_makeMutationCommand.
 *
 * If there is TreeTypeParameters<unknown, unknown> TypeScript will argue that
 * - "type unknown is not assignable to TraversableObjectProp<K, V>"
 * meaning that a more constrained type parameter
 * - "TO_TTP extends TraversableObjectTTP<TraversableObjectPropKey, unknown>"
 * cannot be treated as
 * - "TTP extends TreeTypeParameters<any, any>"
 *
 * Clear way to think about this:
 * If my function accepts a 'number', can I assign it to a variable "V" typed with function that is supposed to accept
 * 'unknown'?
 *
 * ```ts
 * const F = (x: number): void => {}
 * const V: (x: unknown) => void = F; // error
 * ```
 * [Playground Link](https://www.typescriptlang.org/play?#code/MYewdgzgLgBAYjAvDAFADwFwzAVwLYBGApgE4CUWAbiAJYAmSAfDAN4C+AUKJLAGpbosOMAGswIAO5gyTGNXpJ4AbhgB6VTFIkQJDkA)
 *
 * This setup means that we're going to be assigning 'unknown' to 'number' when we invoke function from the variable "V",
 * and TypeScript does not allow that. [1.1]
 * But assigning 'any' to 'number' is allowed because of 'any' semantics.
 *
 * [1.1]
 * https://stackoverflow.com/a/51439876/7788768
 * > unknown which is the type-safe counterpart of any. Anything is assignable to unknown, but unknown isn't assignable
 * to anything but itself and any without a type assertion or a control flow based narrowing. Likewise, no operations
 * are permitted on an unknown without first asserting or narrowing to a more specific type.
 */

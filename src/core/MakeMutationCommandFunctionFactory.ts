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
  RewriteInput = OUT_TTP['VertexData'],
> = {
  makeMutationCommand: MakeMutationCommandFunction<OUT_TTP, RewriteInput>;
};

/** Generic builders replace complete output data; adapters can name another input. */
export type MakeMutationCommandFunction<
  OUT_TTP extends TreeTypeParameters,
  RewriteInput = OUT_TTP['VertexData'],
> = (
  input_2?: MakeMutationCommandFunctionInput<RewriteInput>,
) => MakeMutationCommandFunctionResult<OUT_TTP>;

export type MakeMutationCommandFunctionFactory_2<
  ORDER extends string,
  IN_TTP extends TreeTypeParameters,
  OUT_TTP extends TreeTypeParameters,
  RewriteInput = OUT_TTP['VertexData'],
> = (
  ...visitorArguments: Parameters<TraversalVisitor<ORDER, IN_TTP, OUT_TTP>>
) => MakeMutationCommandFactoryResult<OUT_TTP, RewriteInput>;

export type MakeMutationCommandFunctionFactory<Configuration = unknown> = <
  ORDER extends string,
  IN_TTP extends TreeTypeParameters,
  OUT_TTP extends TreeTypeParameters,
  RewriteInput = OUT_TTP['VertexData'],
>(
  input_0?: Configuration,
) => MakeMutationCommandFunctionFactory_2<ORDER, IN_TTP, OUT_TTP, RewriteInput>;

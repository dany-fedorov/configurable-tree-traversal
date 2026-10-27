import type { VertexTypes } from '@core/TreeTypeParameters';
import type {
  TreeVisitor,
  TraversalVisitorCommand,
} from '@core/TraversalVisitor';
import type { TraversalVisitorCommandName } from '@core/TraversalVisitor';

export type MutationRequest<RW_V> = {
  rewrite?: RW_V;
  delete?: boolean;
};

export type MutationCommand<TTP extends VertexTypes> = TraversalVisitorCommand<
  TTP,
  | TraversalVisitorCommandName.DELETE_VERTEX
  | TraversalVisitorCommandName.REWRITE_VERTEX_DATA
  | TraversalVisitorCommandName.NOOP
>;

export type MutationCommands<
  OUT_TTP extends VertexTypes,
  RewriteInput = OUT_TTP['VertexData'],
> = {
  makeMutationCommand: MutationCommandBuilder<OUT_TTP, RewriteInput>;
};

/** Generic builders replace complete output data; adapters can name another input. */
export type MutationCommandBuilder<
  OUT_TTP extends VertexTypes,
  RewriteInput = OUT_TTP['VertexData'],
> = (request?: MutationRequest<RewriteInput>) => MutationCommand<OUT_TTP>;

export type TreeMutationCommandBinder<
  Phase extends string,
  IN_TTP extends VertexTypes,
  OUT_TTP extends VertexTypes,
  RewriteInput = OUT_TTP['VertexData'],
> = (
  ...visitorArguments: Parameters<TreeVisitor<Phase, IN_TTP, OUT_TTP>>
) => MutationCommands<OUT_TTP, RewriteInput>;

export type TreeMutationCommandBinderFactory<Configuration = unknown> = <
  Phase extends string,
  IN_TTP extends VertexTypes,
  OUT_TTP extends VertexTypes,
  RewriteInput = OUT_TTP['VertexData'],
>(
  options?: Configuration,
) => TreeMutationCommandBinder<Phase, IN_TTP, OUT_TTP, RewriteInput>;

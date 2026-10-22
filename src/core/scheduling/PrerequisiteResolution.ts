import type { OwnerToken } from '@core/effects/types';
import type { VertexId } from '@core/graph/types';

/** Per-runner lookup cache. Transport owns invocation and stores halted outcomes. */
export class PrerequisiteResolution {
  private readonly lookups = new Map<VertexId, OwnerToken | 'settled'>();
  private readonly owners = new Map<number, VertexId>();

  next(unknownIds: readonly VertexId[]): { id: VertexId } | null {
    for (const id of unknownIds) {
      if (!this.lookups.has(id)) return { id };
    }
    return null;
  }

  isComplete(unknownIds: readonly VertexId[]): boolean {
    return (
      this.owners.size === 0 &&
      unknownIds.every((id) => this.lookups.get(id) === 'settled')
    );
  }

  isPending(id: VertexId): boolean {
    const state = this.lookups.get(id);
    return state !== undefined && state !== 'settled';
  }

  start(id: VertexId, owner: OwnerToken): void {
    this.lookups.set(id, owner);
    this.owners.set(owner.id, id);
  }

  isValid(owner: OwnerToken, hasDemand: (id: VertexId) => boolean): boolean {
    return this.owners.has(owner.id) && hasDemand(this.owners.get(owner.id));
  }

  settle(id: VertexId): void {
    const owner = this.lookups.get(id) as OwnerToken;
    this.owners.delete(owner.id);
    this.lookups.set(id, 'settled');
  }

  invalidateUnused(hasDemand: (id: VertexId) => boolean): OwnerToken[] {
    const invalid: OwnerToken[] = [];
    for (const [ownerId, id] of this.owners) {
      if (!hasDemand(id)) {
        invalid.push(this.lookups.get(id) as OwnerToken);
        this.lookups.delete(id);
        this.owners.delete(ownerId);
      }
    }
    return invalid;
  }
}

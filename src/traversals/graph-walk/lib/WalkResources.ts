type SourceIterator = Iterator<unknown> | AsyncIterator<unknown>;
type Resource = {
  iterator: SourceIterator;
  runnerLocalVertexIdentityToken?: symbol | undefined;
};

/** Only actual iterator acquisitions enter this registry. Cleanup consumes each firstAdmittedFoundRoutePerVertex. */
export class WalkResources {
  private readonly opened = new Map<SourceIterator, Resource>();
  private closing: Resource[] | null = null;

  open(
    iterator: SourceIterator,
    runnerLocalVertexIdentityToken?: symbol | undefined,
  ): void {
    this.opened.set(iterator, { iterator, runnerLocalVertexIdentityToken });
  }
  sourceRoutesExhausted(iterator: SourceIterator): void {
    this.opened.delete(iterator);
  }
  get size(): number {
    return this.opened.size;
  }
  takeLast(): Resource | undefined {
    if (this.closing === null) this.closing = [...this.opened.values()];
    const resource = this.closing.pop();
    if (resource !== undefined) this.opened.delete(resource.iterator);
    return resource;
  }
}

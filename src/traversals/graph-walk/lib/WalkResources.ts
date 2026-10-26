type SourceIterator = Iterator<unknown> | AsyncIterator<unknown>;
type Resource = { iterator: SourceIterator; vertexToken?: symbol | undefined };

/** Only actual iterator acquisitions enter this registry. Cleanup consumes each once. */
export class WalkResources {
  private readonly opened = new Map<SourceIterator, Resource>();
  private closing: Resource[] | null = null;

  open(iterator: SourceIterator, vertexToken?: symbol | undefined): void {
    this.opened.set(iterator, { iterator, vertexToken });
  }
  exhausted(iterator: SourceIterator): void {
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

import type {
  GraphWalkOptions,
  GraphWalkConfigureInput,
} from './GraphWalkOptions';
import { GraphWalkRunner } from './GraphWalkRunner';
import { normalizeWalkOptions } from './lib/normalizeWalkOptions';
import type { NormalizedWalkOptions } from './lib/normalizeWalkOptions';

export class GraphWalk<Data, Edge, ID> {
  private options: NormalizedWalkOptions<Data, Edge, ID>;
  constructor(options: GraphWalkOptions<Data, Edge, ID>) {
    this.options = normalizeWalkOptions(options);
  }
  configure(patch: GraphWalkConfigureInput<Data, Edge, ID>): this {
    this.options = normalizeWalkOptions(patch, this.options);
    return this;
  }
  makeRunner(): GraphWalkRunner<Data, Edge, ID> {
    this.assertSupported();
    return new GraphWalkRunner(normalizeWalkOptions({}, this.options));
  }
  private assertSupported(): void {
    const options = this.options;
    if (
      options.revisit !== 'once' ||
      Object.keys(options.limits).length > 0 ||
      options.followEdge !== undefined ||
      options.expandVertex !== undefined ||
      Object.values(options.visitors).some((records) => records.length > 0)
    ) {
      throw new TypeError('This walking configuration is not supported');
    }
  }
}

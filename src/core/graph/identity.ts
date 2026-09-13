import type { VertexId } from '@core/graph/types';

export function sameVertexId(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

export function hasVertexId(value: object): boolean {
  return Object.prototype.hasOwnProperty.call(value, 'vertexId');
}

export function createVertexIdLabeler(): (id: VertexId) => string {
  const referenceLabels = new Map<object, string>();

  return (id: VertexId): string => {
    if ((typeof id === 'object' && id !== null) || typeof id === 'function') {
      const reference = id as object;
      const existing = referenceLabels.get(reference);
      if (existing !== undefined) return existing;
      const label = `reference#${referenceLabels.size + 1}`;
      referenceLabels.set(reference, label);
      return label;
    }

    if (typeof id === 'string') return JSON.stringify(id);
    if (typeof id === 'bigint') return `${id.toString()}n`;
    return String(id);
  };
}

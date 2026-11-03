import {
  Vertex,
  type VertexDataAndChildHintTypes,
  type VertexView,
} from '../src';

type Types = VertexDataAndChildHintTypes<{ value: number }, { id: number }>;

test('editing a structural observation clone cannot mutate a standalone input', () => {
  const data = { value: 1 };
  const hint = { id: 1 };
  const original = new Vertex<Types>({
    $vertexData: data,
    $childDiscoveryHints: [hint],
  });
  const observation: VertexView<Types> = original;
  const clone = observation.createEditableShallowCloneWithContentOverrides();
  clone.getMutableChildDiscoveryHints().push({ id: 2 });
  expect(original.getMutableChildDiscoveryHints()).toEqual([{ id: 1 }]);
  expect(clone.getVertexData()).toBe(data);
  expect(clone.getMutableChildDiscoveryHints()[0]).toBe(hint);
});

test('constructor owns its editable hints without copying caller payload objects', () => {
  const data = { value: 1 };
  const hint = { id: 1 };
  const hints = [hint];
  const vertex = new Vertex<Types>({
    $vertexData: data,
    $childDiscoveryHints: hints,
  });
  hints.push({ id: 2 });
  expect(vertex.getMutableChildDiscoveryHints()).toEqual([{ id: 1 }]);
  vertex.getMutableChildDiscoveryHints().push({ id: 3 });
  expect(hints).toEqual([{ id: 1 }, { id: 2 }]);
  expect(vertex.getVertexData()).toBe(data);
  expect(vertex.getMutableChildDiscoveryHints()[0]).toBe(hint);
});

test('clone overrides and Vertex overrides own their hint arrays', () => {
  const base = new Vertex<Types>({
    $vertexData: { value: 1 },
    $childDiscoveryHints: [],
  });
  const hints = [{ id: 1 }];
  const patched = base.createEditableShallowCloneWithContentOverrides({
    $childDiscoveryHints: hints,
  });
  patched.getMutableChildDiscoveryHints().push({ id: 2 });
  expect(hints).toEqual([{ id: 1 }]);
  const fromVertex =
    base.createEditableShallowCloneWithContentOverrides(patched);
  fromVertex.getMutableChildDiscoveryHints().push({ id: 3 });
  expect(patched.getMutableChildDiscoveryHints()).toEqual([
    { id: 1 },
    { id: 2 },
  ]);
});

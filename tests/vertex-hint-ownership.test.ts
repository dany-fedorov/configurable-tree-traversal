import { Vertex, type VertexTypes, type VertexView } from '../src';

type Types = VertexTypes<{ value: number }, { id: number }>;

test('editing a structural observation clone cannot mutate a standalone input', () => {
  const data = { value: 1 };
  const hint = { id: 1 };
  const original = new Vertex<Types>({ $data: data, $childHints: [hint] });
  const observation: VertexView<Types> = original;
  const clone = observation.clone();
  clone.getChildHints().push({ id: 2 });
  expect(original.getChildHints()).toEqual([{ id: 1 }]);
  expect(clone.getData()).toBe(data);
  expect(clone.getChildHints()[0]).toBe(hint);
});

test('constructor owns its editable hints without copying caller payload objects', () => {
  const data = { value: 1 };
  const hint = { id: 1 };
  const hints = [hint];
  const vertex = new Vertex<Types>({ $data: data, $childHints: hints });
  hints.push({ id: 2 });
  expect(vertex.getChildHints()).toEqual([{ id: 1 }]);
  vertex.getChildHints().push({ id: 3 });
  expect(hints).toEqual([{ id: 1 }, { id: 2 }]);
  expect(vertex.getData()).toBe(data);
  expect(vertex.getChildHints()[0]).toBe(hint);
});

test('clone overrides and Vertex overrides own their hint arrays', () => {
  const base = new Vertex<Types>({ $data: { value: 1 }, $childHints: [] });
  const hints = [{ id: 1 }];
  const patched = base.clone({ $childHints: hints });
  patched.getChildHints().push({ id: 2 });
  expect(hints).toEqual([{ id: 1 }]);
  const fromVertex = base.clone(patched);
  fromVertex.getChildHints().push({ id: 3 });
  expect(patched.getChildHints()).toEqual([{ id: 1 }, { id: 2 }]);
});

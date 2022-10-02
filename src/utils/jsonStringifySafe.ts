const replacerFunc = () => {
  const visited = new WeakSet();
  return (_key: unknown, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (visited.has(value)) {
        return;
      }
      visited.add(value);
    }
    return value;
  };
};

export const jsonStringifySafe = (
  obj: unknown,
  indent?: string | number,
): string => {
  return JSON.stringify(obj, replacerFunc(), indent);
};

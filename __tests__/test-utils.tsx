import { render as rntlRender } from '@testing-library/react-native';

type JsonNode = {
  type: string;
  props: Record<string, unknown>;
  children: unknown[] | null;
} | null;

function getAllByTypeInTree(
  node: JsonNode | unknown[] | null,
  typeName: string
): JsonNode[] {
  if (!node) return [];
  if (Array.isArray(node)) {
    return (node as unknown[]).flatMap((n) =>
      getAllByTypeInTree(n as JsonNode, typeName)
    );
  }
  if (typeof node !== 'object') return [];
  const n = node as JsonNode;
  if (!n) return [];
  const results: JsonNode[] = [];
  if (n.type === typeName) results.push(n);
  if (n.children && Array.isArray(n.children)) {
    results.push(
      ...n.children.flatMap((c) => getAllByTypeInTree(c as JsonNode, typeName))
    );
  }
  return results;
}

function getTypeName(type: unknown): string {
  if (typeof type === 'string') return type;
  const t = type as { displayName?: string; name?: string };
  if (t?.displayName) return t.displayName;
  if (t?.name) return t.name;
  return String(type);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function render(...args: Parameters<typeof rntlRender>): Promise<any> {
  const result = await rntlRender(...args);

  const UNSAFE_getAllByType = (type: unknown): JsonNode[] =>
    getAllByTypeInTree(result.toJSON() as JsonNode, getTypeName(type));

  const UNSAFE_getByType = (type: unknown): JsonNode => {
    const results = UNSAFE_getAllByType(type);
    if (!results.length) {
      throw new Error(`Unable to find component: ${getTypeName(type)}`);
    }
    return results[0];
  };

  const UNSAFE_root = {
    findByType: UNSAFE_getByType,
    findAllByType: UNSAFE_getAllByType,
  };

  return { ...result, UNSAFE_root, UNSAFE_getAllByType, UNSAFE_getByType };
}

export * from '@testing-library/react-native';

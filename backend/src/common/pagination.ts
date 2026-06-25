export async function paginate<T>(
  findMany: () => Promise<T[]>,
  count: () => Promise<number>,
): Promise<{ items: T[]; total: number }> {
  const [items, total] = await Promise.all([findMany(), count()]);
  return { items, total };
}

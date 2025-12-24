export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(items: T[], page: number, limit: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const start = (safePage - 1) * limit;
  const end = start + limit;

  return {
    data: items.slice(start, end),
    page: safePage,
    limit,
    total,
    totalPages,
  };
}

/**
 * Pagination Utilities
 * Provides offset-based and cursor-based pagination
 */

import type {
  PaginationOptions,
  PaginatedResponse,
  CursorPaginationOptions,
  CursorPaginatedResponse,
} from '@insurance-lead-gen/types';

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions
): PaginatedResponse<T> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      cursor: undefined,
    },
  };
}

export function getPaginationParams(options: PaginationOptions): {
  skip: number;
  take: number;
} {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));

  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function encodeCursor(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function decodeCursor(cursor: string): any {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch {
    throw new Error('Invalid cursor');
  }
}

export function createCursorPaginatedResponse<T extends { id: string }>(
  edges: T[],
  options: CursorPaginationOptions,
  hasMore: boolean
): CursorPaginatedResponse<T> {
  const edgesWithCursors = edges.map((node) => ({
    node,
    cursor: encodeCursor({ id: node.id }),
  }));

  const startCursor = edgesWithCursors.length > 0 ? edgesWithCursors[0].cursor : '';
  const endCursor =
    edgesWithCursors.length > 0
      ? edgesWithCursors[edgesWithCursors.length - 1].cursor
      : '';

  return {
    edges: edgesWithCursors,
    pageInfo: {
      hasNextPage: hasMore,
      hasPreviousPage: !!options.before,
      startCursor,
      endCursor,
    },
  };
}

export function getCursorPaginationParams(
  options: CursorPaginationOptions
): {
  take: number;
  cursor?: { id: string };
  skip?: number;
} {
  const first = options.first || 20;
  const last = options.last || 20;

  if (options.after) {
    const afterId = decodeCursor(options.after).id;
    return {
      take: first + 1,
      cursor: { id: afterId },
      skip: 1,
    };
  }

  if (options.before) {
    const beforeId = decodeCursor(options.before).id;
    return {
      take: -(last + 1),
      cursor: { id: beforeId },
      skip: 1,
    };
  }

  return {
    take: first + 1,
  };
}

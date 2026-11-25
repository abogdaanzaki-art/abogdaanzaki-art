export interface PaginationDto {
  page?: number | string;
  limit?: number | string;
}

export function paginate(query: PaginationDto) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

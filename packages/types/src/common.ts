export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 查询参数解析工具：非法值一律回落默认值，避免 NaN 进入 Prisma 导致 500。 */
export class InvalidParamError extends Error {
  constructor(public readonly param: string) {
    super(`invalid param: ${param}`);
    this.name = "InvalidParamError";
  }
}

export function parsePositiveInt(raw: string | null | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
}

export function parsePageParams(
  searchParams: URLSearchParams,
  options: { defaultPageSize?: number; maxPageSize?: number } = {},
): PageParams {
  const defaultPageSize = options.defaultPageSize ?? 20;
  const maxPageSize = options.maxPageSize ?? 100;
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, parsePositiveInt(searchParams.get("pageSize"), defaultPageSize)),
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}

/** 解析 BigInt 参数：空值返回 undefined，非法值抛 InvalidParamError（由 apiError 映射为 400）。 */
export function parseBigIntParam(
  raw: string | null | undefined,
  param: string,
): bigint | undefined {
  if (raw === null || raw === undefined || raw.trim() === "") return undefined;
  const value = raw.trim();
  if (!/^\d+$/.test(value)) throw new InvalidParamError(param);
  return BigInt(value);
}

/** 解析必填 BigInt 路径参数，非法值同样抛 InvalidParamError。 */
export function parseBigIntId(raw: string, param = "id"): bigint {
  const value = parseBigIntParam(raw, param);
  if (value === undefined) throw new InvalidParamError(param);
  return value;
}

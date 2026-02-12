import { Prisma } from "@prisma/client";

export function normalizeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => {
      if (typeof current === "bigint") return Number(current);
      if (current instanceof Prisma.Decimal) return current.toNumber();
      if (current instanceof Date) return current.toISOString();
      return current;
    }),
  ) as T;
}


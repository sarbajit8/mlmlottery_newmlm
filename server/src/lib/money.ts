import { Prisma } from '@prisma/client';

/** Round a Decimal/number to 2dp using standard rounding, returned as a Prisma.Decimal. */
export function round2(value: Prisma.Decimal.Value): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function toNumber(value: Prisma.Decimal.Value): number {
  return new Prisma.Decimal(value).toNumber();
}

/** Extracts the last `length` digits of a ticket number's numeric part (after the prefix's `-`).
 *  E.g. ticketNumberSuffix('BC-01234', 4) -> '1234'. Used to match lottery prize patterns, which
 *  are number endings rather than full ticket numbers. */
export function ticketNumberSuffix(ticketNumber: string, length: number): string {
  const numericPart = ticketNumber.slice(ticketNumber.lastIndexOf('-') + 1);
  return numericPart.slice(-length).padStart(length, '0');
}

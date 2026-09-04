import { stringify } from 'csv-stringify';
import type { Response } from 'express';

export function streamCsv(res: Response, filename: string, columns: string[], rows: (string | number)[][]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const stringifier = stringify({ header: true, columns });
  stringifier.pipe(res);
  for (const row of rows) stringifier.write(row);
  stringifier.end();
}

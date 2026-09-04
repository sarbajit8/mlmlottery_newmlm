import { z } from 'zod';

const fiveDigit = /^\d{5}$/;
const fourDigit = /^\d{4}$/;

function uniqueArray(arr: string[]): boolean {
  return new Set(arr).size === arr.length;
}

function disjoint(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  return b.every((x) => !setA.has(x));
}

export const declareResultSchema = z
  .object({
    drawName: z.string().min(1).max(100),
    drawNumber: z.string().min(1).max(50),
    drawSlotId: z.coerce.number().int().positive(),
    drawDate: z.coerce.date(),

    firstPrizeTicketNumber: z.string().min(1),
    firstPrizeAmount: z.coerce.number().min(0),

    secondPrizeAmount: z.coerce.number().min(0),
    secondPrizeNumbers: z.array(z.string().regex(fiveDigit, 'Must be a 5-digit number')).min(1).max(1000),

    thirdPrizeAmount: z.coerce.number().min(0),
    thirdPrizeNumbers: z.array(z.string().regex(fourDigit, 'Must be a 4-digit number')).min(1).max(10000),

    fourthPrizeAmount: z.coerce.number().min(0),
    fourthPrizeNumbers: z.array(z.string().regex(fourDigit, 'Must be a 4-digit number')).min(1).max(10000),

    fifthPrizeAmount: z.coerce.number().min(0),
    fifthPrizePercentage: z.coerce.number().min(0).max(100),
    fifthPrizeNumbers: z.array(z.string().regex(fourDigit, 'Must be a 4-digit number')).min(1).max(10000),
  })
  .superRefine((data, ctx) => {
    if (!uniqueArray(data.secondPrizeNumbers)) ctx.addIssue({ code: 'custom', path: ['secondPrizeNumbers'], message: 'Numbers must be unique' });
    if (!uniqueArray(data.thirdPrizeNumbers)) ctx.addIssue({ code: 'custom', path: ['thirdPrizeNumbers'], message: 'Numbers must be unique' });
    if (!uniqueArray(data.fourthPrizeNumbers)) ctx.addIssue({ code: 'custom', path: ['fourthPrizeNumbers'], message: 'Numbers must be unique' });
    if (!uniqueArray(data.fifthPrizeNumbers)) ctx.addIssue({ code: 'custom', path: ['fifthPrizeNumbers'], message: 'Numbers must be unique' });

    if (!disjoint(data.thirdPrizeNumbers, data.fourthPrizeNumbers)) {
      ctx.addIssue({ code: 'custom', path: ['fourthPrizeNumbers'], message: 'Fourth prize numbers overlap with third prize' });
    }
    if (!disjoint(data.thirdPrizeNumbers, data.fifthPrizeNumbers)) {
      ctx.addIssue({ code: 'custom', path: ['fifthPrizeNumbers'], message: 'Fifth prize numbers overlap with third prize' });
    }
    if (!disjoint(data.fourthPrizeNumbers, data.fifthPrizeNumbers)) {
      ctx.addIssue({ code: 'custom', path: ['fifthPrizeNumbers'], message: 'Fifth prize numbers overlap with fourth prize' });
    }
  });

export const randomTicketQuerySchema = z.object({
  drawSlotId: z.coerce.number().int().positive(),
  drawDate: z.coerce.date(),
});

export const listResultsQuerySchema = z.object({
  drawDate: z.coerce.date().optional(),
  drawSlotId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listWinnersQuerySchema = z.object({
  drawDate: z.coerce.date().optional(),
  drawSlotId: z.coerce.number().int().positive().optional(),
  mine: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

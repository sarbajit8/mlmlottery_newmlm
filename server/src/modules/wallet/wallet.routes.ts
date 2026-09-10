import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  adminCreditSchema,
  adminDebitSchema,
  agentDirectoryQuerySchema,
  createDepositSchema,
  createWithdrawalSchema,
  exportWithdrawalsQuerySchema,
  idParamSchema,
  listAdjustmentsQuerySchema,
  listDepositsQuerySchema,
  listTransactionsQuerySchema,
  listWithdrawalsQuerySchema,
  processDepositSchema,
  processWithdrawalSchema,
  transferBalanceSchema,
} from './wallet.schema.js';
import {
  adminCreditHandler,
  adminDebitHandler,
  agentDirectoryHandler,
  exportWithdrawalsHandler,
  listAdjustmentsHandler,
  getWalletHandler,
  getWalletRulesHandler,
  listDepositsHandler,
  listTransactionsHandler,
  listTransfersHandler,
  listWithdrawalsHandler,
  processDepositHandler,
  processWithdrawalHandler,
  requestDepositHandler,
  requestWithdrawalHandler,
  transferBalanceHandler,
} from './wallet.controller.js';

export const walletRouter = Router();

walletRouter.use(requireAuth);

const adminRoles = ['SUPER_ADMIN'] as const;

walletRouter.get('/', asyncHandler(getWalletHandler));
walletRouter.get('/rules', asyncHandler(getWalletRulesHandler));
walletRouter.get('/transactions', validate({ query: listTransactionsQuerySchema }), asyncHandler(listTransactionsHandler));
walletRouter.post('/withdrawals', validate({ body: createWithdrawalSchema }), asyncHandler(requestWithdrawalHandler));
walletRouter.get('/withdrawals', validate({ query: listWithdrawalsQuerySchema }), asyncHandler(listWithdrawalsHandler));
walletRouter.get(
  '/withdrawals/export',
  requireRole(...adminRoles),
  validate({ query: exportWithdrawalsQuerySchema }),
  asyncHandler(exportWithdrawalsHandler),
);
walletRouter.put(
  '/withdrawals/:id',
  requireRole(...adminRoles),
  validate({ params: idParamSchema, body: processWithdrawalSchema }),
  asyncHandler(processWithdrawalHandler),
);

walletRouter.post('/deposits', validate({ body: createDepositSchema }), asyncHandler(requestDepositHandler));
walletRouter.get('/deposits', validate({ query: listDepositsQuerySchema }), asyncHandler(listDepositsHandler));
walletRouter.put(
  '/deposits/:id',
  requireRole(...adminRoles),
  validate({ params: idParamSchema, body: processDepositSchema }),
  asyncHandler(processDepositHandler),
);
walletRouter.post(
  '/deposits/credit',
  requireRole(...adminRoles),
  validate({ body: adminCreditSchema }),
  asyncHandler(adminCreditHandler),
);
walletRouter.post(
  '/debit',
  requireRole(...adminRoles),
  validate({ body: adminDebitSchema }),
  asyncHandler(adminDebitHandler),
);
walletRouter.get(
  '/adjustments',
  requireRole(...adminRoles),
  validate({ query: listAdjustmentsQuerySchema }),
  asyncHandler(listAdjustmentsHandler),
);

walletRouter.get('/agents', validate({ query: agentDirectoryQuerySchema }), asyncHandler(agentDirectoryHandler));
walletRouter.post(
  '/transfer',
  requireRole('AGENT'),
  validate({ body: transferBalanceSchema }),
  asyncHandler(transferBalanceHandler),
);
walletRouter.get('/transfers', validate({ query: listTransactionsQuerySchema }), asyncHandler(listTransfersHandler));

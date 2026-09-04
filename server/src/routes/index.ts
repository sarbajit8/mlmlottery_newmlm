import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';
import { drawSlotsRouter } from '../modules/drawSlots/drawSlots.routes.js';
import { seriesRouter } from '../modules/series/series.routes.js';
import { ticketsRouter } from '../modules/tickets/tickets.routes.js';
import { resultsRouter } from '../modules/results/results.routes.js';
import { salesRouter } from '../modules/sales/sales.routes.js';
import { customersRouter } from '../modules/customers/customers.routes.js';
import { mlmRouter } from '../modules/mlm/mlm.routes.js';
import { walletRouter } from '../modules/wallet/wallet.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { systemRouter } from '../modules/system/system.routes.js';
import { paymentMethodsRouter } from '../modules/paymentMethods/paymentMethods.routes.js';
import { bankDetailsRouter } from '../modules/bankDetails/bankDetails.routes.js';
import { supportRouter } from '../modules/support/support.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/draw-slots', drawSlotsRouter);
apiRouter.use('/series', seriesRouter);
apiRouter.use('/tickets', ticketsRouter);
apiRouter.use('/results', resultsRouter);
apiRouter.use('/sales', salesRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/mlm', mlmRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/system', systemRouter);
apiRouter.use('/payment-methods', paymentMethodsRouter);
apiRouter.use('/bank-details', bankDetailsRouter);
apiRouter.use('/support', supportRouter);

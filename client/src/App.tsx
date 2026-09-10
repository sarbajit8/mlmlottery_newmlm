import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { ProtectedRoute, AdminOnlyRoute, AgentOnlyRoute } from '@/routes/ProtectedRoute';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AgentLayout } from '@/components/layout/AgentLayout';

import { LandingPage } from '@/features/marketing/LandingPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { JoinPage } from '@/features/auth/JoinPage';

import { AdminDashboardPage } from '@/features/admin/dashboard/AdminDashboardPage';
import { UsersPage } from '@/features/admin/users/UsersPage';
import { BankDetailsRequestsPage } from '@/features/admin/users/BankDetailsRequestsPage';
import { SupportChatPage as AdminSupportChatPage } from '@/features/admin/users/SupportChatPage';
import { DrawSlotsPage } from '@/features/admin/lottery/DrawSlotsPage';
import { SeriesPage } from '@/features/admin/lottery/SeriesPage';
import { GenerateTicketsPage } from '@/features/admin/lottery/GenerateTicketsPage';
import { AllTicketsPage } from '@/features/admin/lottery/AllTicketsPage';
import { PrizeSettingsPage } from '@/features/admin/lottery/PrizeSettingsPage';
import { DeclareResultsPage } from '@/features/admin/lottery/DeclareResultsPage';
import { PrizeWinnersPage } from '@/features/admin/lottery/PrizeWinnersPage';
import { MlmSettingsPage } from '@/features/admin/mlm/MlmSettingsPage';
import { MlmTreePage } from '@/features/admin/mlm/MlmTreePage';
import { CommissionReportsPage } from '@/features/admin/mlm/CommissionReportsPage';
import { WithdrawalRequestsPage } from '@/features/admin/mlm/WithdrawalRequestsPage';
import { ReportsPage } from '@/features/admin/finance/ReportsPage';
import { TransactionHistoryPage } from '@/features/admin/finance/TransactionHistoryPage';
import { PaymentMethodsPage } from '@/features/admin/finance/PaymentMethodsPage';
import { DepositRequestsPage } from '@/features/admin/finance/DepositRequestsPage';
import { ActivityLogsPage } from '@/features/admin/system/ActivityLogsPage';
import { RolesPermissionsPage } from '@/features/admin/system/RolesPermissionsPage';
import { SettingsPage } from '@/features/admin/system/SettingsPage';

import { AgentDashboardPage } from '@/features/agent/dashboard/AgentDashboardPage';
import { SellTicketsPage } from '@/features/agent/sellTickets/SellTicketsPage';
import { MyTeamPage } from '@/features/agent/myTeam/MyTeamPage';
import { CustomersPage } from '@/features/agent/customers/CustomersPage';
import { MyReportsPage } from '@/features/agent/reports/MyReportsPage';
import { MyCommissionsPage } from '@/features/agent/commissions/MyCommissionsPage';
import { ResultsPage } from '@/features/agent/results/ResultsPage';
import { MyWinnersPage } from '@/features/agent/results/MyWinnersPage';
import { TicketPrintPage } from '@/features/agent/receipts/TicketPrintPage';
import { BankDetailsPage } from '@/features/agent/bankDetails/BankDetailsPage';
import { SupportChatPage as AgentSupportChatPage } from '@/features/agent/support/SupportChatPage';

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join" element={<JoinPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminOnlyRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/users/bank-details" element={<BankDetailsRequestsPage />} />
              <Route path="/admin/support" element={<AdminSupportChatPage />} />
              <Route path="/admin/draw-slots" element={<DrawSlotsPage />} />
              <Route path="/admin/series" element={<SeriesPage />} />
              <Route path="/admin/generate-tickets" element={<GenerateTicketsPage />} />
              <Route path="/admin/tickets" element={<AllTicketsPage />} />
              <Route path="/admin/prize-settings" element={<PrizeSettingsPage />} />
              <Route path="/admin/declare-results" element={<DeclareResultsPage />} />
              <Route path="/admin/winners" element={<PrizeWinnersPage />} />
              <Route path="/admin/mlm/settings" element={<MlmSettingsPage />} />
              <Route path="/admin/mlm/tree" element={<MlmTreePage />} />
              <Route path="/admin/mlm/commissions" element={<CommissionReportsPage />} />
              <Route path="/admin/mlm/withdrawals" element={<WithdrawalRequestsPage />} />
              <Route path="/admin/finance/reports" element={<ReportsPage />} />
              <Route path="/admin/finance/transactions" element={<TransactionHistoryPage />} />
              <Route path="/admin/finance/payouts" element={<WithdrawalRequestsPage />} />
              <Route path="/admin/finance/deposits" element={<DepositRequestsPage />} />
              <Route path="/admin/finance/payment-methods" element={<PaymentMethodsPage />} />
              <Route path="/admin/system/roles" element={<RolesPermissionsPage />} />
              <Route path="/admin/system/activity" element={<ActivityLogsPage />} />
              <Route path="/admin/system/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route element={<AgentOnlyRoute />}>
            <Route path="/agent/receipts/:id/print" element={<TicketPrintPage />} />
            <Route element={<AgentLayout />}>
              <Route path="/agent" element={<AgentDashboardPage />} />
              <Route path="/agent/sell" element={<SellTicketsPage />} />
              <Route path="/agent/team" element={<MyTeamPage />} />
              <Route path="/agent/customers" element={<CustomersPage />} />
              <Route path="/agent/reports" element={<MyReportsPage />} />
              <Route path="/agent/wallet" element={<MyCommissionsPage />} />
              <Route path="/agent/results" element={<ResultsPage />} />
              <Route path="/agent/winners" element={<MyWinnersPage />} />
              <Route path="/agent/bank-details" element={<BankDetailsPage />} />
              <Route path="/agent/support" element={<AgentSupportChatPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

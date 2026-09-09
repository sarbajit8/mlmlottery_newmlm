export type Role = 'SUPER_ADMIN' | 'AGENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_KYC';
export type SlotStatus = 'ACTIVE' | 'OPEN_NOW' | 'DRAW_DONE' | 'CLOSED';
export type BatchStatus = 'OPEN' | 'LOCKED';
export type TicketStatus = 'AVAILABLE' | 'SOLD' | 'WINNER' | 'CANCELLED';
export type CommissionStatus = 'PENDING' | 'PAID' | 'REVERSED';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
export type PayoutMode = 'INSTANT' | 'BATCH';
export type ShortfallPolicy = 'FORFEIT' | 'ROLLUP_TO_ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  whatsapp?: string | null;
  role: Role;
  sponsorId?: number | null;
  referralCode: string;
  status: UserStatus;
  isCompanyWallet: boolean;
  walletBalance: string;
  kycDocUrl?: string | null;
  bankAccountHolder?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  upiId?: string | null;
  createdAt: string;
  sponsor?: { id: number; name: string; referralCode: string } | null;
  _count?: { downline: number };
}

export type BankDetailsStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BankDetailsRequest {
  id: number;
  userId: number;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName?: string | null;
  upiId?: string | null;
  status: BankDetailsStatus;
  rejectionReason?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  user?: { id: number; name: string; referralCode: string; bankAccountHolder?: string | null; bankAccountNumber?: string | null; bankIfsc?: string | null; bankName?: string | null; upiId?: string | null };
}

export interface MyBankDetails {
  bankAccountHolder?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  upiId?: string | null;
  isComplete: boolean;
  pendingRequest: BankDetailsRequest | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DrawSlot {
  id: number;
  name: string;
  salesOpenTime: string;
  drawCloseTime: string;
  isActive: boolean;
  status: SlotStatus;
  salesWindowMinutes: number;
}

export interface Series {
  id: number;
  name: string;
  multiplier: string;
  status: 'ACTIVE' | 'INACTIVE';
  // Server-computed: the admin's single ticket base price x this series' multiplier.
  semValue: string;
}

export interface TicketBatch {
  id: number;
  batchCode: string;
  drawSlotId: number;
  drawDate: string;
  seriesId: number;
  prefix: string;
  startNumber: number;
  quantity: number;
  pricePerTicket: string;
  totalSemValue: string;
  status: BatchStatus;
  createdAt: string;
  drawSlot: DrawSlot;
  series: Series;
  createdBy: { id: number; name: string };
  counts: { available: number; sold: number; cancelled: number; total: number };
  soldPercent: number;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  status: TicketStatus;
  price: string;
  semValue: string;
  soldAt?: string | null;
  series?: { id: number; name: string; multiplier: string };
}

export interface Customer {
  id: number;
  name: string;
  mobile: string;
  whatsapp?: string | null;
  email?: string | null;
  createdAt: string;
  _count?: { tickets: number };
}

export interface PaymentMethod {
  id: number;
  label: string;
  upiId: string;
  qrImage: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: { id: number; name: string };
}

export interface Receipt {
  id: number;
  receiptCode: string;
  agentId: number;
  customerId: number;
  drawSlotId: number;
  drawDate: string;
  totalTickets: number;
  totalSemValue: string;
  totalAmount: string;
  // Sales are paid from the agent's wallet balance now — these only appear on receipts from
  // before that change.
  paymentMethodId?: number | null;
  transactionId?: string | null;
  createdAt: string;
  agent?: { id: number; name: string };
  customer?: Customer;
  drawSlot?: DrawSlot;
  tickets?: Ticket[];
  paymentMethod?: { id: number; label: string; upiId: string };
}

export interface SaleResult {
  receipt: Receipt;
  customer: Customer;
  ticketNumbers: string[];
  waLink: string | null;
}

export type PrizeTier = 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'FIFTH';

export interface DrawResultInput {
  drawName: string;
  drawNumber: string;
  drawSlotId: number;
  drawDate: string;
  firstPrizeTicketNumber: string;
  secondPrizeNumbers: string[];
  thirdPrizeNumbers: string[];
  fourthPrizeNumbers: string[];
  fifthPrizePercentage: number;
  fifthPrizeNumbers: string[];
}

// Admin-configured defaults (AppSetting key "defaultPrizeAmounts") that pre-fill a new result's
// prize amounts — declaring a result can still override any of them per draw.
export interface PrizeAmountDefaults {
  firstPrizeAmount: number;
  secondPrizeAmount: number;
  thirdPrizeAmount: number;
  fourthPrizeAmount: number;
  fifthPrizeAmount: number;
  fifthPrizePercentage: number;
}

export type PrizeTierKey = 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'FIFTH';
// AppSetting "prizeWinCommission" — per prize tier, an array of per-level win-commission %
// (index 0 = level 1 = the selling agent). Length tracks MLM Settings' maxLevels.
export type PrizeWinCommission = Record<PrizeTierKey, number[]>;

export interface WinnerTicket extends Ticket {
  soldByAgent?: { id: number; name: string } | null;
  soldToCustomer?: Customer | null;
}

export interface DrawResultWinnerEntry {
  id: number;
  prizeTier: PrizeTier;
  grossPrizeAmount: string; // full prize won (tier base × series multiplier)
  prizeAmount: string; // net paid to the selling agent = gross − MLM win-commission cut
  ticket: WinnerTicket;
  drawResult?: { id: number; drawName: string; drawNumber: string; declaredAt: string; drawSlot: DrawSlot };
}

export interface DrawResult {
  id: number;
  drawName: string;
  drawNumber: string;
  drawSlotId: number;
  drawDate: string;
  firstPrizeNumber: string; // exactly as the admin entered it — not necessarily a real ticket
  firstPrizeTicket?: WinnerTicket | null; // set only when the number matched a sold ticket
  firstPrizeAmount: string;
  secondPrizeAmount: string;
  secondPrizeNumbers: string[];
  thirdPrizeAmount: string;
  thirdPrizeNumbers: string[];
  fourthPrizeAmount: string;
  fourthPrizeNumbers: string[];
  fifthPrizeAmount: string;
  fifthPrizePercentage: string;
  fifthPrizeNumbers: string[];
  declaredAt: string;
  declaredBy?: { id: number; name: string };
  drawSlot: DrawSlot;
  winners: DrawResultWinnerEntry[];
}

export interface DrawResultListItem extends Omit<DrawResult, 'winners'> {
  totalWinners: number;
  winnerCounts: Record<PrizeTier, number>;
}

export interface MlmLevelPercentage {
  id: number;
  levelNumber: number;
  percentage: string; // sale commission %
  winPercentage: string; // prize-win commission %
}

export interface MlmSettings {
  id: number;
  maxLevels: number;
  commissionBase: 'SEM_VALUE' | 'PRICE' | 'FLAT';
  flatAmount?: string | null;
  payoutMode: PayoutMode;
  minPayoutThreshold: string;
  shortfallPolicy: ShortfallPolicy;
  effectiveFrom: string;
  effectiveTo?: string | null;
  levelPercentages: MlmLevelPercentage[];
}

export interface TreeNode {
  id: number;
  name: string;
  referralCode: string;
  role: Role;
  status: UserStatus;
  sponsorId: number | null;
  depth: number;
  personalSalesToday: number;
  personalSalesMonth: number;
  teamSales: number;
  directCount: number;
  totalDownlineCount: number;
  children: TreeNode[];
}

export interface CommissionLedgerEntry {
  id: number;
  kind: 'SALE' | 'WIN';
  levelNumber: number;
  semValue: string;
  percentageApplied: string;
  commissionAmount: string;
  status: CommissionStatus;
  createdAt: string;
  paidAt?: string | null;
  sourceAgent: { id: number; name: string };
  ticket: { ticketNumber: string };
  receipt: { receiptCode: string };
}

export interface WalletTransaction {
  id: number;
  type: 'COMMISSION' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'DEPOSIT' | 'PURCHASE' | 'PRIZE' | 'TRANSFER' | 'FEE';
  amount: string;
  balanceAfter: string;
  refId?: string | null;
  status: string;
  createdAt: string;
}

// Admin-configured (AppSetting key "walletRules") — withdrawal minimum/step/fee and agent-to-agent
// transfer minimum/step. Read via GET /wallet/rules (any authenticated user).
export interface WalletRules {
  withdrawalMinAmount: number;
  withdrawalMultipleOf: number;
  withdrawalFeePercent: number;
  transferMinAmount: number;
  transferMultipleOf: number;
}

export interface WalletTransfer {
  id: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  createdAt: string;
  fromUser?: { id: number; name: string; referralCode: string };
  toUser?: { id: number; name: string; referralCode: string };
}

export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DepositRequest {
  id: number;
  userId: number;
  amount: string;
  transactionId?: string | null;
  paymentMethodId?: number | null;
  note?: string | null;
  status: DepositStatus;
  requestedAt: string;
  processedAt?: string | null;
  user?: { id: number; name: string; referralCode: string };
  paymentMethod?: { id: number; label: string } | null;
}

export interface WithdrawalRequest {
  id: number;
  userId: number;
  amount: string;
  // Platform fee taken out of `amount` at request time — net payout to the agent = amount - feeAmount.
  feeAmount: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string | null;
  user?: { id: number; name: string; referralCode: string };
}

export interface AdminDashboard {
  ticketsSoldToday: number;
  revenueToday: string;
  ticketsSoldTotal: number;
  revenueTotal: string;
  activeAgents: number;
  commissionPaidToday: string;
  commissionPaidTotal: string;
  pendingWithdrawals: number;
  trend: { date: string; tickets: number; revenue: number }[];
}

export interface AgentDashboard {
  todaySemValue: string;
  todayTicketCount: number;
  monthlySemValue: string;
  monthlyTicketCount: number;
  todayCommission: string;
  teamSales: string;
  directReferrals: number;
}

export interface TicketSummaryCard {
  drawSlotId: number;
  drawSlotName: string;
  available: number;
  sold: number;
  revenue: string;
  batchCount: number;
}

export interface SupportMessage {
  id: number;
  agentId: number;
  senderId: number;
  message: string;
  readByAgent: boolean;
  readByAdmin: boolean;
  createdAt: string;
  sender?: { id: number; name: string; role: Role };
}

export interface SupportThreadSummary {
  agent: { id: number; name: string; referralCode: string; mobile: string };
  lastMessage: { agentId: number; message: string; createdAt: string; senderId: number };
  unreadCount: number;
}

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}

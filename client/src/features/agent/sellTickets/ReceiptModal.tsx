import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/utils/format';
import { IconCheck, IconDownload, IconWallet, IconWhatsapp } from '@/components/ui/icons';
import type { SaleResult } from '@/types/api';

export function ReceiptModal({ sale, onClose }: { sale: SaleResult; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Sale Complete" size="md">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <IconCheck className="h-6 w-6" />
        </div>
        <p className="font-mono text-sm text-slate-400">{sale.receipt.receiptCode}</p>
        <p className="mt-1 text-2xl font-semibold text-emerald-300">{formatCurrency(sale.receipt.totalAmount)}</p>
        <p className="text-xs text-slate-500">{sale.receipt.totalTickets} tickets &middot; {formatDate(sale.receipt.drawDate)}</p>
      </div>

      <div className="mt-4 max-h-32 overflow-y-auto rounded-lg border border-white/8 bg-white/[0.02] p-3">
        <div className="flex flex-wrap gap-1.5">
          {sale.ticketNumbers.map((t) => (
            <span key={t} className="rounded bg-emerald-500/10 px-2 py-1 font-mono text-[11px] text-emerald-300">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-white/8 px-3 py-2.5 text-sm">
        <p className="text-slate-400">Customer</p>
        <p className="font-medium text-slate-100">{sale.customer.name}</p>
        <p className="text-xs text-slate-500">{sale.customer.mobile}</p>
      </div>

      <div className="mt-3 rounded-lg border border-white/8 px-3 py-2.5 text-sm">
        {sale.receipt.paymentMethod ? (
          <>
            <p className="text-slate-400">Paid via {sale.receipt.paymentMethod.label}</p>
            <p className="font-mono text-xs text-slate-300">UTR: {sale.receipt.transactionId}</p>
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-emerald-300">
            <IconWallet className="h-3.5 w-3.5" /> Paid from wallet balance
          </p>
        )}
      </div>

      <a href={`/agent/receipts/${sale.receipt.id}/print`} target="_blank" rel="noreferrer" className="mt-5 block">
        <Button variant="secondary" accent="emerald" className="w-full" icon={<IconDownload className="h-4 w-4" />}>
          Print / Download Tickets
        </Button>
      </a>

      <div className="mt-2 flex gap-2">
        {sale.waLink ? (
          <a href={sale.waLink} target="_blank" rel="noreferrer" className="flex-1">
            <Button accent="emerald" className="w-full" icon={<IconWhatsapp className="h-4 w-4" />}>
              Send via WhatsApp
            </Button>
          </a>
        ) : (
          <p className="flex-1 text-center text-xs text-slate-500">No WhatsApp number on file for this customer.</p>
        )}
        <Button variant="secondary" accent="emerald" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

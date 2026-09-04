export interface ReceiptWaLinkInput {
  whatsapp: string;
  customerName: string;
  receiptCode: string;
  drawSlotName: string;
  drawDate: string;
  ticketNumbers: string[];
  totalAmount: number;
}

/** Builds a wa.me deep link with a pre-filled receipt message. No WhatsApp Business API needed. */
export function buildReceiptWaLink(input: ReceiptWaLinkInput): string {
  const digitsOnly = input.whatsapp.replace(/[^\d]/g, '');
  const lines = [
    `Hi ${input.customerName}, here is your lottery ticket receipt:`,
    `Receipt: ${input.receiptCode}`,
    `Draw: ${input.drawSlotName} on ${input.drawDate}`,
    `Tickets (${input.ticketNumbers.length}): ${input.ticketNumbers.join(', ')}`,
    `Total Paid: Rs. ${input.totalAmount.toFixed(2)}`,
    `Good luck!`,
  ];
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${digitsOnly}?text=${text}`;
}

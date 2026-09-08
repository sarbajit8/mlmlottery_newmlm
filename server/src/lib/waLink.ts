export interface ReceiptWaLinkInput {
  whatsapp: string;
  drawSlotName: string;
  drawDate: string;
  ticketNumbers: string[];
  totalAmount: number;
}

/** Builds a wa.me deep link with the ticket-purchase confirmation pre-filled. No WhatsApp Business
 *  API needed — opening the link launches WhatsApp with the message ready to send. */
export function buildReceiptWaLink(input: ReceiptWaLinkInput): string {
  const digitsOnly = input.whatsapp.replace(/[^\d]/g, '');
  const lines = [
    `Draw: ${input.drawSlotName} on ${input.drawDate}`,
    `Tickets (${input.ticketNumbers.length}): ${input.ticketNumbers.join(', ')}`,
    `Total Paid: Rs. ${input.totalAmount.toFixed(2)}`,
  ];
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${digitsOnly}?text=${text}`;
}

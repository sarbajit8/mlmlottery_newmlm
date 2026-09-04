-- DropIndex
DROP INDEX `tickets_ticket_number_key` ON `tickets`;

-- CreateIndex
CREATE UNIQUE INDEX `tickets_ticket_number_draw_date_key` ON `tickets`(`ticket_number`, `draw_date`);

-- CreateIndex
CREATE UNIQUE INDEX `ticket_batches_prefix_draw_date_key` ON `ticket_batches`(`prefix`, `draw_date`);

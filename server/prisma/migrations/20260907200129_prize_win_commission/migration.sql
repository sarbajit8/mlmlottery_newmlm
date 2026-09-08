-- AlterTable
ALTER TABLE `commission_ledger` ADD COLUMN `draw_result_id` INTEGER NULL,
    ADD COLUMN `kind` ENUM('SALE', 'WIN') NOT NULL DEFAULT 'SALE';

-- AlterTable
ALTER TABLE `mlm_level_percentages` ADD COLUMN `win_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `commission_ledger_draw_result_id_idx` ON `commission_ledger`(`draw_result_id`);

-- CreateIndex
CREATE INDEX `commission_ledger_kind_idx` ON `commission_ledger`(`kind`);

-- AddForeignKey
ALTER TABLE `commission_ledger` ADD CONSTRAINT `commission_ledger_draw_result_id_fkey` FOREIGN KEY (`draw_result_id`) REFERENCES `draw_results`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

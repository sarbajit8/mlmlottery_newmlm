-- AlterTable
ALTER TABLE `series` DROP COLUMN `base_price`;

-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('COMMISSION', 'WITHDRAWAL', 'ADJUSTMENT', 'DEPOSIT', 'PURCHASE', 'PRIZE') NOT NULL;

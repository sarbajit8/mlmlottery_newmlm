-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('COMMISSION', 'WITHDRAWAL', 'ADJUSTMENT', 'DEPOSIT', 'PURCHASE', 'PRIZE', 'TRANSFER', 'FEE') NOT NULL;

-- AlterTable
ALTER TABLE `withdrawal_requests` ADD COLUMN `fee_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `wallet_transfers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `from_user_id` INTEGER NOT NULL,
    `to_user_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wallet_transfers_from_user_id_idx`(`from_user_id`),
    INDEX `wallet_transfers_to_user_id_idx`(`to_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wallet_transfers` ADD CONSTRAINT `wallet_transfers_from_user_id_fkey` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transfers` ADD CONSTRAINT `wallet_transfers_to_user_id_fkey` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

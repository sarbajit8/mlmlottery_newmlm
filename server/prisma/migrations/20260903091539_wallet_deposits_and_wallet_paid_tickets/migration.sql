-- DropForeignKey
ALTER TABLE `receipts` DROP FOREIGN KEY `receipts_payment_method_id_fkey`;

-- AlterTable
ALTER TABLE `receipts` MODIFY `payment_method_id` INTEGER NULL,
    MODIFY `transaction_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `type` ENUM('COMMISSION', 'WITHDRAWAL', 'ADJUSTMENT', 'DEPOSIT', 'PURCHASE') NOT NULL;

-- CreateTable
CREATE TABLE `deposit_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `transaction_id` VARCHAR(191) NULL,
    `payment_method_id` INTEGER NULL,
    `note` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `processed_by` INTEGER NULL,

    UNIQUE INDEX `deposit_requests_transaction_id_key`(`transaction_id`),
    INDEX `deposit_requests_user_id_idx`(`user_id`),
    INDEX `deposit_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposit_requests` ADD CONSTRAINT `deposit_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposit_requests` ADD CONSTRAINT `deposit_requests_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposit_requests` ADD CONSTRAINT `deposit_requests_processed_by_fkey` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

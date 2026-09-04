-- AlterTable
ALTER TABLE `users` ADD COLUMN `bank_account_holder` VARCHAR(191) NULL,
    ADD COLUMN `bank_account_number` VARCHAR(191) NULL,
    ADD COLUMN `bank_ifsc` VARCHAR(191) NULL,
    ADD COLUMN `bank_name` VARCHAR(191) NULL,
    ADD COLUMN `upi_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `bank_details_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `bank_account_holder` VARCHAR(191) NOT NULL,
    `bank_account_number` VARCHAR(191) NOT NULL,
    `bank_ifsc` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NULL,
    `upi_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `rejection_reason` TEXT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `processed_by` INTEGER NULL,

    INDEX `bank_details_requests_user_id_idx`(`user_id`),
    INDEX `bank_details_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bank_details_requests` ADD CONSTRAINT `bank_details_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_details_requests` ADD CONSTRAINT `bank_details_requests_processed_by_fkey` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

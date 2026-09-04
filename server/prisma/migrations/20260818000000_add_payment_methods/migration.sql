-- CreateTable
CREATE TABLE `payment_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(191) NOT NULL,
    `upi_id` VARCHAR(191) NOT NULL,
    `qr_image` TEXT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `payment_methods_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `receipts` ADD COLUMN `payment_method_id` INTEGER NOT NULL,
    ADD COLUMN `transaction_id` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `receipts_transaction_id_key` ON `receipts`(`transaction_id`);

-- CreateIndex
CREATE INDEX `receipts_payment_method_id_idx` ON `receipts`(`payment_method_id`);

-- AddForeignKey
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

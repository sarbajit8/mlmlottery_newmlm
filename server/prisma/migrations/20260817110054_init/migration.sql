-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'DISTRIBUTOR', 'SUB_DISTRIBUTOR', 'AGENT') NOT NULL,
    `sponsor_id` INTEGER NULL,
    `referral_code` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING_KYC') NOT NULL DEFAULT 'PENDING_KYC',
    `is_company_wallet` BOOLEAN NOT NULL DEFAULT false,
    `wallet_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `kyc_doc_url` VARCHAR(191) NULL,
    `approved_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `refresh_token_hash` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_referral_code_key`(`referral_code`),
    INDEX `users_sponsor_id_idx`(`sponsor_id`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draw_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `sales_open_time` TIME(0) NOT NULL,
    `draw_close_time` TIME(0) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVE', 'OPEN_NOW', 'DRAW_DONE', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `draw_slots_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `series` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `multiplier` DECIMAL(10, 2) NOT NULL,
    `base_price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `series_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_code` VARCHAR(191) NOT NULL,
    `draw_slot_id` INTEGER NOT NULL,
    `draw_date` DATE NOT NULL,
    `series_id` INTEGER NOT NULL,
    `prefix` VARCHAR(191) NOT NULL,
    `start_number` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price_per_ticket` DECIMAL(10, 2) NOT NULL,
    `total_sem_value` DECIMAL(14, 2) NOT NULL,
    `status` ENUM('OPEN', 'LOCKED') NOT NULL DEFAULT 'OPEN',
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ticket_batches_batch_code_key`(`batch_code`),
    INDEX `ticket_batches_draw_slot_id_draw_date_idx`(`draw_slot_id`, `draw_date`),
    INDEX `ticket_batches_series_id_idx`(`series_id`),
    INDEX `ticket_batches_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batch_id` INTEGER NOT NULL,
    `ticket_number` VARCHAR(191) NOT NULL,
    `draw_slot_id` INTEGER NOT NULL,
    `draw_date` DATE NOT NULL,
    `series_id` INTEGER NOT NULL,
    `status` ENUM('AVAILABLE', 'SOLD', 'WINNER', 'CANCELLED') NOT NULL DEFAULT 'AVAILABLE',
    `sem_value` DECIMAL(12, 2) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `sold_by_agent_id` INTEGER NULL,
    `sold_to_customer_id` INTEGER NULL,
    `sold_at` DATETIME(3) NULL,
    `receipt_id` INTEGER NULL,

    UNIQUE INDEX `tickets_ticket_number_key`(`ticket_number`),
    INDEX `tickets_status_idx`(`status`),
    INDEX `tickets_draw_slot_id_draw_date_series_id_status_idx`(`draw_slot_id`, `draw_date`, `series_id`, `status`),
    INDEX `tickets_sold_by_agent_id_idx`(`sold_by_agent_id`),
    INDEX `tickets_sold_to_customer_id_idx`(`sold_to_customer_id`),
    INDEX `tickets_receipt_id_idx`(`receipt_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `created_by_agent_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customers_mobile_idx`(`mobile`),
    UNIQUE INDEX `customers_created_by_agent_id_mobile_key`(`created_by_agent_id`, `mobile`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receipt_code` VARCHAR(191) NOT NULL,
    `agent_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `draw_slot_id` INTEGER NOT NULL,
    `draw_date` DATE NOT NULL,
    `total_tickets` INTEGER NOT NULL,
    `total_sem_value` DECIMAL(14, 2) NOT NULL,
    `total_amount` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `receipts_receipt_code_key`(`receipt_code`),
    INDEX `receipts_agent_id_idx`(`agent_id`),
    INDEX `receipts_customer_id_idx`(`customer_id`),
    INDEX `receipts_draw_slot_id_draw_date_idx`(`draw_slot_id`, `draw_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draw_results` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draw_slot_id` INTEGER NOT NULL,
    `draw_date` DATE NOT NULL,
    `winning_ticket_id` INTEGER NOT NULL,
    `prize_amount` DECIMAL(12, 2) NOT NULL,
    `declared_by` INTEGER NOT NULL,
    `declared_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `draw_results_winning_ticket_id_key`(`winning_ticket_id`),
    INDEX `draw_results_draw_slot_id_draw_date_idx`(`draw_slot_id`, `draw_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mlm_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `max_levels` INTEGER NOT NULL,
    `commission_base` ENUM('SEM_VALUE', 'PRICE', 'FLAT') NOT NULL DEFAULT 'SEM_VALUE',
    `flat_amount` DECIMAL(10, 2) NULL,
    `payout_mode` ENUM('INSTANT', 'BATCH') NOT NULL DEFAULT 'INSTANT',
    `min_payout_threshold` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `shortfall_policy` ENUM('FORFEIT', 'ROLLUP_TO_ADMIN') NOT NULL DEFAULT 'ROLLUP_TO_ADMIN',
    `effective_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effective_to` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mlm_settings_effective_from_effective_to_idx`(`effective_from`, `effective_to`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mlm_level_percentages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mlm_settings_id` INTEGER NOT NULL,
    `level_number` INTEGER NOT NULL,
    `percentage` DECIMAL(5, 2) NOT NULL,

    UNIQUE INDEX `mlm_level_percentages_mlm_settings_id_level_number_key`(`mlm_settings_id`, `level_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_ledger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `receipt_id` INTEGER NOT NULL,
    `ticket_id` INTEGER NOT NULL,
    `earning_agent_id` INTEGER NOT NULL,
    `source_agent_id` INTEGER NOT NULL,
    `level_number` INTEGER NOT NULL,
    `sem_value` DECIMAL(12, 2) NOT NULL,
    `percentage_applied` DECIMAL(5, 2) NOT NULL,
    `commission_amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paid_at` DATETIME(3) NULL,

    INDEX `commission_ledger_earning_agent_id_idx`(`earning_agent_id`),
    INDEX `commission_ledger_source_agent_id_idx`(`source_agent_id`),
    INDEX `commission_ledger_receipt_id_idx`(`receipt_id`),
    INDEX `commission_ledger_ticket_id_idx`(`ticket_id`),
    INDEX `commission_ledger_status_idx`(`status`),
    INDEX `commission_ledger_earning_agent_id_created_at_idx`(`earning_agent_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` ENUM('COMMISSION', 'WITHDRAWAL', 'ADJUSTMENT') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `balance_after` DECIMAL(12, 2) NOT NULL,
    `ref_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'REVERSED') NOT NULL DEFAULT 'COMPLETED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `wallet_transactions_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `wallet_transactions_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawal_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID') NOT NULL DEFAULT 'PENDING',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `processed_by` INTEGER NULL,

    INDEX `withdrawal_requests_user_id_idx`(`user_id`),
    INDEX `withdrawal_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_id` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` INTEGER NULL,
    `metadata` JSON NULL,
    `ip_address` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actor_id_idx`(`actor_id`),
    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_sponsor_id_fkey` FOREIGN KEY (`sponsor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_batches` ADD CONSTRAINT `ticket_batches_draw_slot_id_fkey` FOREIGN KEY (`draw_slot_id`) REFERENCES `draw_slots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_batches` ADD CONSTRAINT `ticket_batches_series_id_fkey` FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_batches` ADD CONSTRAINT `ticket_batches_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `ticket_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_draw_slot_id_fkey` FOREIGN KEY (`draw_slot_id`) REFERENCES `draw_slots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_series_id_fkey` FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_sold_by_agent_id_fkey` FOREIGN KEY (`sold_by_agent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_sold_to_customer_id_fkey` FOREIGN KEY (`sold_to_customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_receipt_id_fkey` FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_created_by_agent_id_fkey` FOREIGN KEY (`created_by_agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_draw_slot_id_fkey` FOREIGN KEY (`draw_slot_id`) REFERENCES `draw_slots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_results` ADD CONSTRAINT `draw_results_draw_slot_id_fkey` FOREIGN KEY (`draw_slot_id`) REFERENCES `draw_slots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_results` ADD CONSTRAINT `draw_results_winning_ticket_id_fkey` FOREIGN KEY (`winning_ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_results` ADD CONSTRAINT `draw_results_declared_by_fkey` FOREIGN KEY (`declared_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mlm_level_percentages` ADD CONSTRAINT `mlm_level_percentages_mlm_settings_id_fkey` FOREIGN KEY (`mlm_settings_id`) REFERENCES `mlm_settings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_ledger` ADD CONSTRAINT `commission_ledger_receipt_id_fkey` FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_ledger` ADD CONSTRAINT `commission_ledger_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_ledger` ADD CONSTRAINT `commission_ledger_earning_agent_id_fkey` FOREIGN KEY (`earning_agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_ledger` ADD CONSTRAINT `commission_ledger_source_agent_id_fkey` FOREIGN KEY (`source_agent_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_processed_by_fkey` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

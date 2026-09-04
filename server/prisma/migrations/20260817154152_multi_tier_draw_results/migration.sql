-- DropForeignKey
ALTER TABLE `draw_results` DROP FOREIGN KEY `draw_results_winning_ticket_id_fkey`;

-- DropIndex
DROP INDEX `draw_results_winning_ticket_id_key` ON `draw_results`;

-- AlterTable
ALTER TABLE `draw_results` DROP COLUMN `prize_amount`,
    DROP COLUMN `winning_ticket_id`,
    ADD COLUMN `draw_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `draw_number` VARCHAR(191) NOT NULL,
    ADD COLUMN `fifth_prize_amount` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `fifth_prize_numbers` JSON NOT NULL,
    ADD COLUMN `fifth_prize_percentage` DECIMAL(5, 2) NOT NULL,
    ADD COLUMN `first_prize_amount` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `first_prize_ticket_id` INTEGER NOT NULL,
    ADD COLUMN `fourth_prize_amount` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `fourth_prize_numbers` JSON NOT NULL,
    ADD COLUMN `second_prize_amount` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `second_prize_numbers` JSON NOT NULL,
    ADD COLUMN `third_prize_amount` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `third_prize_numbers` JSON NOT NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- CreateTable
CREATE TABLE `draw_result_winners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draw_result_id` INTEGER NOT NULL,
    `ticket_id` INTEGER NOT NULL,
    `prize_tier` ENUM('FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH') NOT NULL,
    `prize_amount` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `draw_result_winners_ticket_id_idx`(`ticket_id`),
    INDEX `draw_result_winners_draw_result_id_prize_tier_idx`(`draw_result_id`, `prize_tier`),
    UNIQUE INDEX `draw_result_winners_draw_result_id_ticket_id_key`(`draw_result_id`, `ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `draw_results_first_prize_ticket_id_key` ON `draw_results`(`first_prize_ticket_id`);

-- AddForeignKey
ALTER TABLE `draw_results` ADD CONSTRAINT `draw_results_first_prize_ticket_id_fkey` FOREIGN KEY (`first_prize_ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_result_winners` ADD CONSTRAINT `draw_result_winners_draw_result_id_fkey` FOREIGN KEY (`draw_result_id`) REFERENCES `draw_results`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_result_winners` ADD CONSTRAINT `draw_result_winners_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


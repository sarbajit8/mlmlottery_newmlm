-- The 1st-prize number no longer has to match a generated ticket.
--  * first_prize_number stores what the admin typed (always present)
--  * first_prize_ticket_id becomes nullable — set only when the number matched a sold ticket

-- DropForeignKey
ALTER TABLE `draw_results` DROP FOREIGN KEY `draw_results_first_prize_ticket_id_fkey`;

-- AlterTable: add the column nullable first, backfill from the linked ticket, then lock it down
ALTER TABLE `draw_results`
    ADD COLUMN `first_prize_number` VARCHAR(191) NULL,
    MODIFY `first_prize_ticket_id` INTEGER NULL;

UPDATE `draw_results` dr
    JOIN `tickets` t ON t.`id` = dr.`first_prize_ticket_id`
    SET dr.`first_prize_number` = t.`ticket_number`
    WHERE dr.`first_prize_number` IS NULL;

UPDATE `draw_results` SET `first_prize_number` = '' WHERE `first_prize_number` IS NULL;

ALTER TABLE `draw_results` MODIFY `first_prize_number` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `draw_results` ADD CONSTRAINT `draw_results_first_prize_ticket_id_fkey` FOREIGN KEY (`first_prize_ticket_id`) REFERENCES `tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

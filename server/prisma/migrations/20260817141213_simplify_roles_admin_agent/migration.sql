-- Simplify the role model to just SUPER_ADMIN and AGENT (Distributor/Sub-Distributor removed).
-- Safe to run: no rows reference DISTRIBUTOR/SUB_DISTRIBUTOR at this point (cleaned up beforehand).
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('SUPER_ADMIN', 'AGENT') NOT NULL;

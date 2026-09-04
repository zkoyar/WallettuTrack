-- AlterTable
ALTER TABLE `Account` MODIFY `icon` VARCHAR(191) NOT NULL DEFAULT '🏦';

-- AlterTable
ALTER TABLE `Category` MODIFY `icon` VARCHAR(191) NOT NULL DEFAULT '📦';

-- AlterTable
ALTER TABLE `Goal` MODIFY `icon` VARCHAR(191) NOT NULL DEFAULT '🎯';

-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `transferGroupId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Transaction_transferGroupId_idx` ON `Transaction`(`transferGroupId`);

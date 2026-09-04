-- AlterTable
ALTER TABLE `Category` MODIFY `icon` VARCHAR(191) NOT NULL DEFAULT '📦';

-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `externalId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Transaction_userId_externalId_idx` ON `Transaction`(`userId`, `externalId`);

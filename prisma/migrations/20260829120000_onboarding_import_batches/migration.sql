ALTER TABLE `User`
  ADD COLUMN `onboardingCompletedAt` DATETIME(3) NULL;

-- Gli account creati prima dell'introduzione del wizard sono gia configurati.
UPDATE `User`
SET `onboardingCompletedAt` = CURRENT_TIMESTAMP(3)
WHERE `onboardingCompletedAt` IS NULL;

CREATE TABLE `ImportBatch` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `source` VARCHAR(191) NOT NULL,
  `totalRows` INTEGER NOT NULL,
  `importedRows` INTEGER NOT NULL,
  `duplicateRows` INTEGER NOT NULL DEFAULT 0,
  `skippedRows` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `undoneAt` DATETIME(3) NULL,

  INDEX `ImportBatch_userId_accountId_createdAt_idx`(`userId`, `accountId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Transaction`
  ADD COLUMN `importBatchId` VARCHAR(191) NULL,
  ADD INDEX `Transaction_importBatchId_idx`(`importBatchId`);

ALTER TABLE `ImportBatch`
  ADD CONSTRAINT `ImportBatch_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ImportBatch`
  ADD CONSTRAINT `ImportBatch_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Transaction`
  ADD CONSTRAINT `Transaction_importBatchId_fkey`
  FOREIGN KEY (`importBatchId`) REFERENCES `ImportBatch`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

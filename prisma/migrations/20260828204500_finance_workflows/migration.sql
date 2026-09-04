CREATE TABLE `Tag` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `color` VARCHAR(191) NOT NULL DEFAULT '#6366f1',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Tag_userId_name_key`(`userId`, `name`),
  INDEX `Tag_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TransactionTag` (
  `transactionId` VARCHAR(191) NOT NULL,
  `tagId` VARCHAR(191) NOT NULL,

  INDEX `TransactionTag_tagId_idx`(`tagId`),
  PRIMARY KEY (`transactionId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AccountReconciliation` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `balanceBefore` DECIMAL(14, 2) NOT NULL,
  `actualBalance` DECIMAL(14, 2) NOT NULL,
  `difference` DECIMAL(14, 2) NOT NULL,
  `notes` VARCHAR(191) NULL,
  `reconciledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `AccountReconciliation_userId_accountId_reconciledAt_idx`(`userId`, `accountId`, `reconciledAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AlertPreference` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `accountId` VARCHAR(191) NOT NULL,
  `budgetAlerts` BOOLEAN NOT NULL DEFAULT true,
  `upcomingAlerts` BOOLEAN NOT NULL DEFAULT true,
  `upcomingDays` INTEGER NOT NULL DEFAULT 7,
  `goalAlerts` BOOLEAN NOT NULL DEFAULT true,
  `lowBalanceEnabled` BOOLEAN NOT NULL DEFAULT false,
  `lowBalanceThreshold` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `unusualExpenseEnabled` BOOLEAN NOT NULL DEFAULT false,
  `unusualExpenseThreshold` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `subscriptionAlerts` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `AlertPreference_accountId_key`(`accountId`),
  INDEX `AlertPreference_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Tag`
  ADD CONSTRAINT `Tag_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TransactionTag`
  ADD CONSTRAINT `TransactionTag_transactionId_fkey`
  FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TransactionTag`
  ADD CONSTRAINT `TransactionTag_tagId_fkey`
  FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccountReconciliation`
  ADD CONSTRAINT `AccountReconciliation_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AccountReconciliation`
  ADD CONSTRAINT `AccountReconciliation_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AlertPreference`
  ADD CONSTRAINT `AlertPreference_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AlertPreference`
  ADD CONSTRAINT `AlertPreference_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

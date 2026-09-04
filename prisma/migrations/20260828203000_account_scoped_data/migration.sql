-- Collega al conto attivo anche pianificazioni, budget e obiettivi.
ALTER TABLE `RecurrenceRule` ADD COLUMN `accountId` VARCHAR(191) NULL;
ALTER TABLE `PlannedEvent` ADD COLUMN `accountId` VARCHAR(191) NULL;
ALTER TABLE `Budget` ADD COLUMN `accountId` VARCHAR(191) NULL;
ALTER TABLE `Goal` ADD COLUMN `accountId` VARCHAR(191) NULL;

-- I dati esistenti vengono assegnati al primo conto dell'utente, quando presente.
UPDATE `RecurrenceRule` AS `item`
JOIN (
  SELECT `id`, `userId`
  FROM (
    SELECT
      `id`,
      `userId`,
      ROW_NUMBER() OVER (
        PARTITION BY `userId`
        ORDER BY `sortOrder`, `createdAt`, `id`
      ) AS `position`
    FROM `Account`
  ) AS `ranked_accounts`
  WHERE `position` = 1
) AS `first_account` ON `first_account`.`userId` = `item`.`userId`
SET `item`.`accountId` = `first_account`.`id`
WHERE `item`.`accountId` IS NULL;

UPDATE `PlannedEvent` AS `item`
JOIN (
  SELECT `id`, `userId`
  FROM (
    SELECT
      `id`,
      `userId`,
      ROW_NUMBER() OVER (
        PARTITION BY `userId`
        ORDER BY `sortOrder`, `createdAt`, `id`
      ) AS `position`
    FROM `Account`
  ) AS `ranked_accounts`
  WHERE `position` = 1
) AS `first_account` ON `first_account`.`userId` = `item`.`userId`
SET `item`.`accountId` = `first_account`.`id`
WHERE `item`.`accountId` IS NULL;

UPDATE `Budget` AS `item`
JOIN (
  SELECT `id`, `userId`
  FROM (
    SELECT
      `id`,
      `userId`,
      ROW_NUMBER() OVER (
        PARTITION BY `userId`
        ORDER BY `sortOrder`, `createdAt`, `id`
      ) AS `position`
    FROM `Account`
  ) AS `ranked_accounts`
  WHERE `position` = 1
) AS `first_account` ON `first_account`.`userId` = `item`.`userId`
SET `item`.`accountId` = `first_account`.`id`
WHERE `item`.`accountId` IS NULL;

UPDATE `Goal` AS `item`
JOIN (
  SELECT `id`, `userId`
  FROM (
    SELECT
      `id`,
      `userId`,
      ROW_NUMBER() OVER (
        PARTITION BY `userId`
        ORDER BY `sortOrder`, `createdAt`, `id`
      ) AS `position`
    FROM `Account`
  ) AS `ranked_accounts`
  WHERE `position` = 1
) AS `first_account` ON `first_account`.`userId` = `item`.`userId`
SET `item`.`accountId` = `first_account`.`id`
WHERE `item`.`accountId` IS NULL;

DROP INDEX `Budget_userId_categoryId_period_key` ON `Budget`;
DROP INDEX `Transaction_userId_externalId_key` ON `Transaction`;

CREATE INDEX `RecurrenceRule_accountId_idx` ON `RecurrenceRule`(`accountId`);
CREATE INDEX `PlannedEvent_accountId_idx` ON `PlannedEvent`(`accountId`);
CREATE INDEX `Budget_accountId_idx` ON `Budget`(`accountId`);
CREATE INDEX `Goal_accountId_idx` ON `Goal`(`accountId`);
CREATE UNIQUE INDEX `Budget_userId_accountId_categoryId_period_key`
  ON `Budget`(`userId`, `accountId`, `categoryId`, `period`);
CREATE UNIQUE INDEX `Transaction_userId_accountId_externalId_key`
  ON `Transaction`(`userId`, `accountId`, `externalId`);

ALTER TABLE `RecurrenceRule`
  ADD CONSTRAINT `RecurrenceRule_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `PlannedEvent`
  ADD CONSTRAINT `PlannedEvent_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Budget`
  ADD CONSTRAINT `Budget_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Goal`
  ADD CONSTRAINT `Goal_accountId_fkey`
  FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `PlannedEvent`
  MODIFY `description` VARCHAR(200) NULL,
  MODIFY `notes` TEXT NULL;

ALTER TABLE `Transaction`
  MODIFY `description` VARCHAR(200) NULL,
  MODIFY `notes` TEXT NULL,
  MODIFY `externalId` VARCHAR(255) NULL;

ALTER TABLE `RecurrenceRule`
  MODIFY `description` VARCHAR(200) NULL,
  MODIFY `notes` TEXT NULL;

ALTER TABLE `AccountReconciliation`
  MODIFY `notes` TEXT NULL;

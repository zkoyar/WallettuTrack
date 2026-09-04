-- Derived values can legitimately exceed one individual DECIMAL(14, 2)
-- amount. These wider columns still stay within the application's safe-cent
-- integer range.
ALTER TABLE `User`
  MODIFY `currentBalance` DECIMAL(16, 2) NOT NULL DEFAULT 0;

ALTER TABLE `Transaction`
  MODIFY `amountBase` DECIMAL(16, 2) NOT NULL;

ALTER TABLE `AccountReconciliation`
  MODIFY `difference` DECIMAL(15, 2) NOT NULL;

-- Currency values are validated against the supported allowlist by every
-- application write path; narrow storage prevents malformed/oversized codes.
ALTER TABLE `User`
  MODIFY `baseCurrency` CHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE `Goal`
  MODIFY `currency` CHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE `PlannedEvent`
  MODIFY `currency` CHAR(3) NOT NULL;

ALTER TABLE `Transaction`
  MODIFY `currency` CHAR(3) NOT NULL;

ALTER TABLE `RecurrenceRule`
  MODIFY `currency` CHAR(3) NOT NULL;

ALTER TABLE `Budget`
  MODIFY `currency` CHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE `ExchangeRate`
  MODIFY `code` CHAR(3) NOT NULL;

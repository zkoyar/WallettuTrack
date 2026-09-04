-- I conti diventano la fonte autorevole del saldo consolidato.
UPDATE `User` AS `u`
LEFT JOIN (
  SELECT `userId`, COALESCE(SUM(`currentBalance`), 0) AS `totalBalance`
  FROM `Account`
  GROUP BY `userId`
) AS `balances` ON `balances`.`userId` = `u`.`id`
SET `u`.`currentBalance` = COALESCE(`balances`.`totalBalance`, `u`.`currentBalance`);

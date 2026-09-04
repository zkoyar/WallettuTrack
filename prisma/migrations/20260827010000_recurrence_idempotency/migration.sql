-- Compatibilità con eventuali doppioni creati prima dell'idempotenza.
-- Conserviamo tutti i movimenti finanziari: soltanto le copie successive
-- perdono il riferimento tecnico usato per riconoscerle come generate/importate.
UPDATE `Transaction` AS `target`
INNER JOIN (
    SELECT `id`
    FROM (
        SELECT
            `id`,
            ROW_NUMBER() OVER (
                PARTITION BY `userId`, `recurrenceRuleId`, `date`
                ORDER BY `createdAt`, `id`
            ) AS `duplicateNumber`
        FROM `Transaction`
        WHERE `recurrenceRuleId` IS NOT NULL
    ) AS `rankedRecurrences`
    WHERE `duplicateNumber` > 1
) AS `duplicateRecurrences` ON `duplicateRecurrences`.`id` = `target`.`id`
SET `target`.`recurrenceRuleId` = NULL;

UPDATE `Transaction` AS `target`
INNER JOIN (
    SELECT `id`
    FROM (
        SELECT
            `id`,
            ROW_NUMBER() OVER (
                PARTITION BY `userId`, `externalId`
                ORDER BY `createdAt`, `id`
            ) AS `duplicateNumber`
        FROM `Transaction`
        WHERE `externalId` IS NOT NULL
    ) AS `rankedExternalIds`
    WHERE `duplicateNumber` > 1
) AS `duplicateExternalIds` ON `duplicateExternalIds`.`id` = `target`.`id`
SET `target`.`externalId` = NULL;

-- L'indice non univoco viene sostituito dal vincolo equivalente e più forte.
DROP INDEX `Transaction_userId_externalId_idx` ON `Transaction`;

CREATE UNIQUE INDEX `Transaction_userId_externalId_key`
ON `Transaction`(`userId`, `externalId`);

CREATE UNIQUE INDEX `Transaction_userId_recurrenceRuleId_date_key`
ON `Transaction`(`userId`, `recurrenceRuleId`, `date`);

-- Translate only exact built-in defaults. User-created names remain unchanged.
-- Skip a rename when the user already has an item with the English target name.

UPDATE `User` SET `locale` = 'en-GB' WHERE `locale` = 'it-IT';

UPDATE `Account` AS source
LEFT JOIN `Account` AS target
  ON target.`userId` = source.`userId` AND target.`name` = 'Main account'
SET source.`name` = 'Main account'
WHERE source.`name` = 'Conto principale' AND target.`id` IS NULL;

UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Groceries' SET source.`name` = 'Groceries' WHERE source.`name` = 'Spesa alimentare' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Housing and rent' SET source.`name` = 'Housing and rent' WHERE source.`name` = 'Casa e affitto' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Transport' SET source.`name` = 'Transport' WHERE source.`name` = 'Trasporti' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Utilities' SET source.`name` = 'Utilities' WHERE source.`name` = 'Bollette' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Dining' SET source.`name` = 'Dining' WHERE source.`name` = 'Ristoranti' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Health' SET source.`name` = 'Health' WHERE source.`name` = 'Salute' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Entertainment' SET source.`name` = 'Entertainment' WHERE source.`name` = 'Svago' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Clothing' SET source.`name` = 'Clothing' WHERE source.`name` = 'Abbigliamento' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Travel' SET source.`name` = 'Travel' WHERE source.`name` = 'Viaggi' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Education' SET source.`name` = 'Education' WHERE source.`name` = 'Istruzione' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Subscriptions' SET source.`name` = 'Subscriptions' WHERE source.`name` = 'Abbonamenti' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Other' SET source.`name` = 'Other' WHERE source.`name` = 'Altro' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Salary' SET source.`name` = 'Salary' WHERE source.`name` = 'Stipendio' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Investments' SET source.`name` = 'Investments' WHERE source.`name` = 'Investimenti' AND target.`id` IS NULL;
UPDATE `Category` AS source LEFT JOIN `Category` AS target ON target.`userId` = source.`userId` AND target.`name` = 'Gifts' SET source.`name` = 'Gifts' WHERE source.`name` = 'Regali' AND target.`id` IS NULL;

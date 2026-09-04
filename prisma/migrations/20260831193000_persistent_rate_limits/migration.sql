CREATE TABLE `RateLimitBucket` (
  `keyHash` CHAR(64) NOT NULL,
  `scope` VARCHAR(32) NOT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `windowStartedAt` DATETIME(3) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `RateLimitBucket_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`keyHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

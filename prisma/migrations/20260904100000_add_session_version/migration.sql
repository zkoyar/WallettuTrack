-- Invalidate all previously issued JWT sessions when credentials change.
ALTER TABLE `User`
    ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;

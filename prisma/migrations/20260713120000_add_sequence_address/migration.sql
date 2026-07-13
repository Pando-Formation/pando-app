-- Structured postal address for a séquence's lieu, so a PRESENTIEL
-- convocation can carry a real "show up here" address instead of the
-- free-text "lieu" label alone.

ALTER TABLE "Sequence" ADD COLUMN "address" TEXT;
ALTER TABLE "Sequence" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Sequence" ADD COLUMN "city" TEXT;

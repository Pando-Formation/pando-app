-- ═══════════════════════════════════════════════════════════════════════════
--  Fix sequence_has_demi_journee — array_length() on an EMPTY array returns
--  NULL in Postgres, not 0. `NULL >= 1` is neither true nor false, so a CHECK
--  built on array_length() silently ADMITS a séquence with zero demi-journées
--  — exactly the corruption this constraint exists to block.
--
--  cardinality() returns 0 for an empty array, which is what this needs.
--  Found by prisma/fixtures/slice4-parcours.ts.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "Sequence" DROP CONSTRAINT sequence_has_demi_journee;

ALTER TABLE "Sequence" ADD CONSTRAINT sequence_has_demi_journee
  CHECK (cardinality("demiJournees") >= 1);

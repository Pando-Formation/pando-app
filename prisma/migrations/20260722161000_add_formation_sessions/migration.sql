-- CreateTable
CREATE TABLE "FormationSession" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FormationSession_pkey" PRIMARY KEY ("id")
);

-- Backfill one container session per existing parcours so every current
-- evidence-bearing Sequence keeps a required parent without changing its
-- own dates, demi-journées, or proof chain.
INSERT INTO "FormationSession" ("id", "parcoursId", "ordre", "titre", "createdAt", "updatedAt")
SELECT
    'session-' || "id",
    "id",
    1,
    'Session initiale',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Parcours";

-- AlterTable
ALTER TABLE "Sequence" ADD COLUMN "formationSessionId" TEXT;

-- Backfill
UPDATE "Sequence"
SET "formationSessionId" = 'session-' || "parcoursId";

-- AlterTable
ALTER TABLE "Sequence" ALTER COLUMN "formationSessionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "FormationSession_parcoursId_idx" ON "FormationSession"("parcoursId");

-- CreateIndex
CREATE INDEX "FormationSession_deletedAt_idx" ON "FormationSession"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FormationSession_parcoursId_ordre_key" ON "FormationSession"("parcoursId", "ordre");

-- CreateIndex
CREATE INDEX "Sequence_formationSessionId_idx" ON "Sequence"("formationSessionId");

-- AddForeignKey
ALTER TABLE "FormationSession" ADD CONSTRAINT "FormationSession_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_formationSessionId_fkey" FOREIGN KEY ("formationSessionId") REFERENCES "FormationSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

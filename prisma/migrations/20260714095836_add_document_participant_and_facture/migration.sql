-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "factureId" TEXT,
ADD COLUMN     "parcoursParticipantId" TEXT;

-- AlterTable
ALTER TABLE "Sequence" ADD COLUMN     "factureId" TEXT;

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "contractualisationId" TEXT NOT NULL,
    "montantHT" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3),
    "chorusProSentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facture_contractualisationId_idx" ON "Facture"("contractualisationId");

-- CreateIndex
CREATE INDEX "Document_parcoursParticipantId_idx" ON "Document"("parcoursParticipantId");

-- CreateIndex
CREATE INDEX "Document_factureId_idx" ON "Document"("factureId");

-- CreateIndex
CREATE INDEX "Sequence_factureId_idx" ON "Sequence"("factureId");

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_contractualisationId_fkey" FOREIGN KEY ("contractualisationId") REFERENCES "Contractualisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_parcoursParticipantId_fkey" FOREIGN KEY ("parcoursParticipantId") REFERENCES "ParcoursParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;


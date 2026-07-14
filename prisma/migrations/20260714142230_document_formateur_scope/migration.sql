-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "formateurId" TEXT;

-- CreateIndex
CREATE INDEX "Document_formateurId_idx" ON "Document"("formateurId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

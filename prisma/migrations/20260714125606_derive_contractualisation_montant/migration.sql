-- Drop the CHECK constraint that references "remise" before dropping the column
-- (not visible to Prisma's schema diffing — it was added via raw SQL in 0002_check_constraints).
ALTER TABLE "Contractualisation" DROP CONSTRAINT contract_amounts_non_negative;

-- AlterTable
ALTER TABLE "Contractualisation" DROP COLUMN "priceMode",
DROP COLUMN "remise";

-- DropEnum
DROP TYPE "PriceMode";

-- Re-add a simplified non-negative check now that remise is gone.
ALTER TABLE "Contractualisation" ADD CONSTRAINT contract_montant_non_negative CHECK ("montantHT" >= 0);

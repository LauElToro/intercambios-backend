-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mfaCode" TEXT,
ADD COLUMN     "mfaCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

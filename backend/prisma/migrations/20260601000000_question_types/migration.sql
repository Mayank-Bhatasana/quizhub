-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE', 'MULTIPLE', 'TRUE_FALSE');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "type" "QuestionType" NOT NULL DEFAULT 'SINGLE';

-- AlterTable
ALTER TABLE "ParticipantAnswer" ADD COLUMN     "selectedOptionIds" UUID[] DEFAULT ARRAY[]::UUID[];

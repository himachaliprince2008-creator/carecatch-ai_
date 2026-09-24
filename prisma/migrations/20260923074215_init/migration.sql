-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('GOVERNMENT', 'HOSPITAL', 'INSURER', 'PARTNER', 'DEMO');

-- CreateEnum
CREATE TYPE "HospitalType" AS ENUM ('HOSPITAL', 'CLINIC', 'SPECIALTY_CENTER', 'AMBULATORY_CENTER', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "addressLine1" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "hospitalType" "HospitalType" NOT NULL DEFAULT 'HOSPITAL',
    "hasIcu" BOOLEAN NOT NULL DEFAULT false,
    "hasEmergency" BOOLEAN NOT NULL DEFAULT false,
    "acceptsPmJay" BOOLEAN NOT NULL DEFAULT false,
    "hasNabhAccreditation" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(3,2),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "phone" TEXT,
    "websiteUrl" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disease" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalSpecialization" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalSpecialization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalFacility" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentCost" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "minAmount" DECIMAL(12,2),
    "maxAmount" DECIMAL(12,2),
    "notes" TEXT,
    "sourceId" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseOutcome" (
    "id" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "value" TEXT,
    "reportingPeriodStart" TIMESTAMP(3),
    "reportingPeriodEnd" TIMESTAMP(3),
    "sourceId" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiseaseOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalReview" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalVerification" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "notes" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedHospital" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedHospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialty" TEXT,
    "locationText" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "budgetCurrency" TEXT,
    "budgetMax" DECIMAL(12,2),
    "requirements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "url" TEXT,
    "publisher" TEXT,
    "retrievedAt" TIMESTAMP(3),
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isSynthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalDiseaseMetric" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "reportingPeriod" TEXT,
    "totalReportedCases" INTEGER,
    "patientsTreated" INTEGER,
    "successfulReportedOutcomes" INTEGER,
    "sourceId" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalDiseaseMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_slug_key" ON "Hospital"("slug");

-- CreateIndex
CREATE INDEX "Hospital_latitude_longitude_idx" ON "Hospital"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Hospital_isSynthetic_idx" ON "Hospital"("isSynthetic");

-- CreateIndex
CREATE INDEX "Hospital_hospitalType_city_idx" ON "Hospital"("hospitalType", "city");

-- CreateIndex
CREATE INDEX "Hospital_hasIcu_hasEmergency_acceptsPmJay_hasNabhAccreditat_idx" ON "Hospital"("hasIcu", "hasEmergency", "acceptsPmJay", "hasNabhAccreditation");

-- CreateIndex
CREATE UNIQUE INDEX "Disease_slug_key" ON "Disease"("slug");

-- CreateIndex
CREATE INDEX "Disease_name_idx" ON "Disease"("name");

-- CreateIndex
CREATE INDEX "HospitalSpecialization_specialty_idx" ON "HospitalSpecialization"("specialty");

-- CreateIndex
CREATE INDEX "HospitalSpecialization_diseaseId_idx" ON "HospitalSpecialization"("diseaseId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalSpecialization_hospitalId_diseaseId_specialty_key" ON "HospitalSpecialization"("hospitalId", "diseaseId", "specialty");

-- CreateIndex
CREATE INDEX "HospitalFacility_name_idx" ON "HospitalFacility"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalFacility_hospitalId_name_key" ON "HospitalFacility"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "TreatmentCost_hospitalId_diseaseId_treatmentId_idx" ON "TreatmentCost"("hospitalId", "diseaseId", "treatmentId");

-- CreateIndex
CREATE INDEX "TreatmentCost_currency_idx" ON "TreatmentCost"("currency");

-- CreateIndex
CREATE INDEX "DiseaseOutcome_diseaseId_idx" ON "DiseaseOutcome"("diseaseId");

-- CreateIndex
CREATE INDEX "HospitalReview_hospitalId_rating_idx" ON "HospitalReview"("hospitalId", "rating");

-- CreateIndex
CREATE INDEX "HospitalReview_userId_idx" ON "HospitalReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalVerification_hospitalId_key" ON "HospitalVerification"("hospitalId");

-- CreateIndex
CREATE INDEX "HospitalVerification_status_idx" ON "HospitalVerification"("status");

-- CreateIndex
CREATE INDEX "SavedHospital_userId_createdAt_idx" ON "SavedHospital"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedHospital_userId_hospitalId_key" ON "SavedHospital"("userId", "hospitalId");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_createdAt_idx" ON "SearchHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchHistory_specialty_idx" ON "SearchHistory"("specialty");

-- CreateIndex
CREATE INDEX "SearchHistory_latitude_longitude_idx" ON "SearchHistory"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "DataSource_type_idx" ON "DataSource"("type");

-- CreateIndex
CREATE INDEX "DataSource_isSynthetic_idx" ON "DataSource"("isSynthetic");

-- CreateIndex
CREATE UNIQUE INDEX "Treatment_slug_key" ON "Treatment"("slug");

-- CreateIndex
CREATE INDEX "HospitalDiseaseMetric_hospitalId_diseaseId_treatmentId_idx" ON "HospitalDiseaseMetric"("hospitalId", "diseaseId", "treatmentId");

-- AddForeignKey
ALTER TABLE "HospitalSpecialization" ADD CONSTRAINT "HospitalSpecialization_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalSpecialization" ADD CONSTRAINT "HospitalSpecialization_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalSpecialization" ADD CONSTRAINT "HospitalSpecialization_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalFacility" ADD CONSTRAINT "HospitalFacility_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalFacility" ADD CONSTRAINT "HospitalFacility_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentCost" ADD CONSTRAINT "TreatmentCost_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentCost" ADD CONSTRAINT "TreatmentCost_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentCost" ADD CONSTRAINT "TreatmentCost_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentCost" ADD CONSTRAINT "TreatmentCost_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseOutcome" ADD CONSTRAINT "DiseaseOutcome_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseOutcome" ADD CONSTRAINT "DiseaseOutcome_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalReview" ADD CONSTRAINT "HospitalReview_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalReview" ADD CONSTRAINT "HospitalReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalVerification" ADD CONSTRAINT "HospitalVerification_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalVerification" ADD CONSTRAINT "HospitalVerification_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedHospital" ADD CONSTRAINT "SavedHospital_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedHospital" ADD CONSTRAINT "SavedHospital_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalDiseaseMetric" ADD CONSTRAINT "HospitalDiseaseMetric_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalDiseaseMetric" ADD CONSTRAINT "HospitalDiseaseMetric_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "Disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalDiseaseMetric" ADD CONSTRAINT "HospitalDiseaseMetric_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalDiseaseMetric" ADD CONSTRAINT "HospitalDiseaseMetric_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

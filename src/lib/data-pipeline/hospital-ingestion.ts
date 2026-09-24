import "server-only";

import { DataSourceType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const dataSourceTypeSchema = z.enum(["GOVERNMENT", "HOSPITAL", "INSURER", "PARTNER", "DEMO"]);

const optionalText = z.string().trim().min(1).optional().nullable();

export const externalHospitalRecordSchema = z.object({
  externalId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: optionalText,
  addressLine1: optionalText,
  city: z.string().trim().min(1),
  state: optionalText,
  postalCode: optionalText,
  country: z.string().trim().length(2).default("US"),
  latitude: z.number().finite().min(-90).max(90).optional().nullable(),
  longitude: z.number().finite().min(-180).max(180).optional().nullable(),
  phone: optionalText,
  websiteUrl: z.string().url().optional().nullable(),
  specializations: z.array(z.object({ diseaseName: z.string().trim().min(1), specialty: z.string().trim().min(1) })).default([]),
  facilities: z.array(z.object({ name: z.string().trim().min(1), description: optionalText })).default([]),
  treatmentCosts: z.array(z.object({ diseaseName: z.string().trim().min(1), currency: z.string().trim().length(3).default("USD"), minAmount: z.number().finite().nonnegative().optional().nullable(), maxAmount: z.number().finite().nonnegative().optional().nullable(), notes: optionalText })).default([]),
}).superRefine((record, context) => {
  if ((record.latitude === null) !== (record.longitude === null)) {
    context.addIssue({ code: "custom", message: "latitude and longitude must be provided together", path: [record.latitude === null ? "latitude" : "longitude"] });
  }
  for (const cost of record.treatmentCosts) {
    if (cost.minAmount != null && cost.maxAmount != null && cost.minAmount > cost.maxAmount) {
      context.addIssue({ code: "custom", message: "minAmount cannot exceed maxAmount", path: ["treatmentCosts"] });
    }
  }
});

export type ExternalHospitalRecord = z.input<typeof externalHospitalRecordSchema>;

type CleanHospitalRecord = z.output<typeof externalHospitalRecordSchema>;

export type IngestionSource = {
  id: string;
  name: string;
  type: z.infer<typeof dataSourceTypeSchema>;
  url?: string | null;
  publisher?: string | null;
  retrievedAt?: Date | null;
};

export type IngestionResult = {
  imported: number;
  rejected: number;
  errors: Array<{ externalId: string | null; message: string }>;
};

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function cleanRecord(record: CleanHospitalRecord): CleanHospitalRecord {
  return {
    ...record,
    name: record.name.replace(/\s+/g, " ").trim(),
    description: cleanText(record.description),
    addressLine1: cleanText(record.addressLine1),
    city: record.city.replace(/\s+/g, " ").trim(),
    state: cleanText(record.state),
    postalCode: cleanText(record.postalCode),
    country: record.country.toUpperCase(),
    phone: cleanText(record.phone),
    websiteUrl: record.websiteUrl || null,
    specializations: record.specializations.map((item) => ({ diseaseName: item.diseaseName.replace(/\s+/g, " ").trim(), specialty: item.specialty.replace(/\s+/g, " ").trim() })),
    facilities: record.facilities.map((item) => ({ name: item.name.replace(/\s+/g, " ").trim(), description: cleanText(item.description) })),
    treatmentCosts: record.treatmentCosts.map((item) => ({ ...item, currency: item.currency.toUpperCase(), notes: cleanText(item.notes) })),
  };
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

export async function ingestHospitalRecords(records: readonly unknown[], source: IngestionSource): Promise<IngestionResult> {
  const result: IngestionResult = { imported: 0, rejected: 0, errors: [] };
  for (const rawRecord of records) {
    const externalId = typeof rawRecord === "object" && rawRecord !== null && "externalId" in rawRecord && typeof rawRecord.externalId === "string" ? rawRecord.externalId : null;
    const parsed = externalHospitalRecordSchema.safeParse(rawRecord);
    if (!parsed.success) {
      result.rejected += 1;
      result.errors.push({ externalId, message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
      continue;
    }

    try {
      await prisma.$transaction((transaction) => persistRecordWithClient(transaction, cleanRecord(parsed.data), source));
      result.imported += 1;
    } catch (error) {
      result.rejected += 1;
      result.errors.push({ externalId: parsed.data.externalId, message: error instanceof Error ? error.message : "Database persistence failed." });
    }
  }
  return result;
}

async function persistRecordWithClient(transaction: Prisma.TransactionClient, record: CleanHospitalRecord, source: IngestionSource) {
  const isSynthetic = source.type === "DEMO";
  const sourceRecord = await transaction.dataSource.upsert({ where: { id: source.id }, update: { name: source.name, type: source.type as DataSourceType, url: source.url ?? null, publisher: source.publisher ?? null, retrievedAt: source.retrievedAt ?? new Date(), isSynthetic }, create: { id: source.id, name: source.name, type: source.type as DataSourceType, url: source.url ?? null, publisher: source.publisher ?? null, retrievedAt: source.retrievedAt ?? new Date(), isSynthetic } });
  const slug = `external-${slugify(source.id)}-${slugify(record.externalId)}`;
  const hospital = await transaction.hospital.upsert({ where: { slug }, update: { name: record.name, description: record.description, addressLine1: record.addressLine1, city: record.city, state: record.state, postalCode: record.postalCode, country: record.country, latitude: record.latitude, longitude: record.longitude, phone: record.phone, websiteUrl: record.websiteUrl, isSynthetic }, create: { slug, name: record.name, description: record.description, addressLine1: record.addressLine1, city: record.city, state: record.state, postalCode: record.postalCode, country: record.country, latitude: record.latitude, longitude: record.longitude, phone: record.phone, websiteUrl: record.websiteUrl, isSynthetic } });
  await transaction.hospitalVerification.upsert({ where: { hospitalId: hospital.id }, update: { sourceId: sourceRecord.id }, create: { hospitalId: hospital.id, sourceId: sourceRecord.id, status: "PENDING", notes: "Imported from an external source; manual verification is still required." } });
  for (const specialization of record.specializations) {
    const disease = await transaction.disease.upsert({ where: { slug: slugify(specialization.diseaseName) }, update: {}, create: { name: specialization.diseaseName, slug: slugify(specialization.diseaseName), isSynthetic } });
    await transaction.hospitalSpecialization.upsert({ where: { hospitalId_diseaseId_specialty: { hospitalId: hospital.id, diseaseId: disease.id, specialty: specialization.specialty } }, update: { sourceId: sourceRecord.id }, create: { hospitalId: hospital.id, diseaseId: disease.id, specialty: specialization.specialty, sourceId: sourceRecord.id } });
  }
  for (const facility of record.facilities) await transaction.hospitalFacility.upsert({ where: { hospitalId_name: { hospitalId: hospital.id, name: facility.name } }, update: { description: facility.description, sourceId: sourceRecord.id }, create: { hospitalId: hospital.id, name: facility.name, description: facility.description, sourceId: sourceRecord.id } });
  for (const cost of record.treatmentCosts) {
    const disease = await transaction.disease.upsert({ where: { slug: slugify(cost.diseaseName) }, update: {}, create: { name: cost.diseaseName, slug: slugify(cost.diseaseName), isSynthetic } });
    const treatment = await transaction.treatment.upsert({ where: { slug: slugify(cost.diseaseName) }, update: {}, create: { name: cost.diseaseName, slug: slugify(cost.diseaseName), isSynthetic } });
    await transaction.treatmentCost.create({ data: { hospitalId: hospital.id, diseaseId: disease.id, treatmentId: treatment.id, currency: cost.currency, minAmount: cost.minAmount, maxAmount: cost.maxAmount, notes: cost.notes, sourceId: sourceRecord.id, isSynthetic } });
  }
}

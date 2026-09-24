import { PrismaClient, DataSourceType, UserRole, VerificationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Every record in this seed is intentionally synthetic and must never be shown as verified data.
  const demoSource = await prisma.dataSource.upsert({
    where: { id: "demo-synthetic-source" },
    update: {},
    create: {
      id: "demo-synthetic-source",
      name: "DEMO / SYNTHETIC DATA ONLY",
      type: DataSourceType.DEMO,
      publisher: "CareMatch AI development seed",
      retrievedAt: new Date(),
      isSynthetic: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo.user@carematch.invalid" },
    update: {},
    create: {
      email: "demo.user@carematch.invalid",
      displayName: "Demo User (Synthetic)",
      role: UserRole.USER,
    },
  });

  const disease = await prisma.disease.upsert({
    where: { slug: "demo-specialty-example" },
    update: {},
    create: {
      name: "DEMO Specialty Example",
      slug: "demo-specialty-example",
      description: "Synthetic placeholder used to test relationships only.",
      isSynthetic: true,
    },
  });

  const hospital = await prisma.hospital.upsert({
    where: { slug: "demo-synthetic-care-center-north" },
    update: {},
    create: {
      name: "DEMO Synthetic Care Center North",
      slug: "demo-synthetic-care-center-north",
      description: "Synthetic placeholder. Not a real hospital or verified facility.",
      city: "Demo City",
      state: "DM",
      postalCode: "00000",
      country: "US",
      latitude: 0,
      longitude: 0,
      isSynthetic: true,
    },
  });

  await prisma.hospitalSpecialization.upsert({
    where: { hospitalId_diseaseId_specialty: { hospitalId: hospital.id, diseaseId: disease.id, specialty: "DEMO specialty" } },
    update: {},
    create: { hospitalId: hospital.id, diseaseId: disease.id, specialty: "DEMO specialty", sourceId: demoSource.id },
  });

  await prisma.hospitalFacility.upsert({
    where: { hospitalId_name: { hospitalId: hospital.id, name: "DEMO facility attribute" } },
    update: {},
    create: { hospitalId: hospital.id, name: "DEMO facility attribute", description: "Synthetic placeholder only.", sourceId: demoSource.id },
  });

  await prisma.hospitalVerification.upsert({
    where: { hospitalId: hospital.id },
    update: {},
    create: { hospitalId: hospital.id, status: VerificationStatus.PENDING, notes: "Synthetic seed record; not verified.", sourceId: demoSource.id },
  });

  await prisma.savedHospital.upsert({
    where: { userId_hospitalId: { userId: user.id, hospitalId: hospital.id } },
    update: {},
    create: { userId: user.id, hospitalId: hospital.id, note: "DEMO saved record" },
  });

  console.log("Seed complete: synthetic demo records created. They are not real or verified healthcare data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

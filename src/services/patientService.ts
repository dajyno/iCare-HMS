import { prisma } from "../lib/prisma";

export async function getAllPatients() {
  return await prisma.patient.findMany({
    orderBy: { registrationDate: "desc" },
  });
}

export async function getPatientById(id: string) {
  return await prisma.patient.findUnique({
    where: { id },
    include: {
      appointments: {
        include: { doctor: true },
        orderBy: { date: "desc" },
      },
      consultations: {
        include: { doctor: true, vitalSigns: true },
        orderBy: { createdAt: "desc" },
      },
      billing: {
        orderBy: { createdAt: "desc" },
      },
      admissions: {
        include: { bed: { include: { ward: true } } },
      },
      labRequests: {
        include: { test: true },
      },
      prescriptions: {
        include: { doctor: true, items: { include: { medication: true } } },
      },
    },
  });
}

export async function createPatient(data: any) {
  // Simple duplicate detection
  const existing = await prisma.patient.findFirst({
    where: {
      OR: [
        { patientId: data.patientId },
        { phone: data.phone },
        { AND: [{ firstName: data.firstName }, { lastName: data.lastName }, { dateOfBirth: new Date(data.dateOfBirth) }] },
      ],
    },
  });

  if (existing) {
    throw new Error("Patient already exists with these details");
  }

  return await prisma.patient.create({
    data: {
      ...data,
      dateOfBirth: new Date(data.dateOfBirth),
    },
  });
}

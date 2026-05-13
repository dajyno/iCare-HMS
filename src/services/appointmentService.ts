import { prisma } from "../lib/prisma";

export async function getAppointments(filters: any = {}) {
  return await prisma.appointment.findMany({
    where: filters,
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: { date: "asc" },
  });
}

export async function createAppointment(data: any) {
  return await prisma.appointment.create({
    data: {
      patientId: data.patientId,
      doctorId: data.doctorId,
      date: new Date(data.date),
      time: data.time,
      reason: data.reason,
      status: "Scheduled",
    },
  });
}

export async function updateAppointmentStatus(id: string, status: string) {
  return await prisma.appointment.update({
    where: { id },
    data: { status },
  });
}

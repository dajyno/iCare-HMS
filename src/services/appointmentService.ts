import { prisma } from "../lib/prisma";
import type { AppointmentStatus } from "../lib/types";

export async function getAppointments(filters: any = {}) {
  return await prisma.appointment.findMany({
    where: filters,
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getAppointmentsByDate(date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return await prisma.appointment.findMany({
    where: {
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
    },
    include: {
      patient: true,
      doctor: true,
    },
    orderBy: { startTime: "asc" },
  });
}

export async function createAppointment(data: {
  patientId: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  reason?: string;
  status?: string;
}) {
  return await prisma.appointment.create({
    data: {
      patientId: data.patientId,
      doctorId: data.doctorId,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason,
      status: data.status || "Unconfirmed",
    },
  });
}

export async function updateAppointment(id: string, data: any) {
  return await prisma.appointment.update({
    where: { id },
    data,
  });
}

export async function updateAppointmentStatus(id: string, status: string) {
  return await prisma.appointment.update({
    where: { id },
    data: { status },
  });
}

export async function deleteAppointment(id: string) {
  return await prisma.appointment.delete({
    where: { id },
  });
}

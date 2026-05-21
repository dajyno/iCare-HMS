import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import type { Appointment, AppointmentStatus } from "@/src/lib/types";

export interface DoctorSlot {
  id: string;
  name: string;
  specialty?: string;
}

export function useAppointments(date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return useQuery<Appointment[]>({
    queryKey: ["appointments", date.toISOString().split("T")[0]],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("*, patient:patients(*), doctor:users(*)")
          .gte("start_time", dayStart.toISOString())
          .lte("start_time", dayEnd.toISOString())
          .order("start_time", { ascending: true });
        if (error) throw error;
        return toCamel(data) as Appointment[];
      } catch {
        const mock: Appointment[] = [
          {
            id: "mock-apt-1",
            patientId: "mock-pt-1",
            doctorId: "mock-doc-1",
            startTime: `${date.toISOString().split("T")[0]}T09:00:00`,
            endTime: `${date.toISOString().split("T")[0]}T09:30:00`,
            reason: "General Consultation",
            status: "Confirmed",
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            patient: {
              id: "mock-pt-1",
              patientId: "MD/0016/23",
              firstName: "Jerel Kevin",
              lastName: "Parocha",
              gender: "Male",
              dateOfBirth: "1990-01-01",
              phone: "1234567890",
              category: "Individual",
              status: "active",
              registrationDate: new Date().toISOString(),
            } as any,
            doctor: {
              id: "mock-doc-1",
              fullName: "Dr. Adebayo",
              email: "adebayo@example.com",
              role: "Doctor",
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any,
          },
          {
            id: "mock-apt-2",
            patientId: "mock-pt-2",
            doctorId: "mock-doc-1",
            startTime: `${date.toISOString().split("T")[0]}T10:00:00`,
            endTime: `${date.toISOString().split("T")[0]}T10:30:00`,
            reason: "Follow-up",
            status: "Waiting",
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            patient: {
              id: "mock-pt-2",
              patientId: "EG/0042/99",
              firstName: "Charity",
              lastName: "Enyioko",
              gender: "Female",
              dateOfBirth: "1985-05-15",
              phone: "0987654321",
              category: "Individual",
              status: "active",
              registrationDate: new Date().toISOString(),
            } as any,
            doctor: {
              id: "mock-doc-1",
              fullName: "Dr. Adebayo",
              email: "adebayo@example.com",
              role: "Doctor",
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any,
          },
          {
            id: "mock-apt-3",
            patientId: "mock-pt-3",
            doctorId: "mock-doc-2",
            startTime: `${date.toISOString().split("T")[0]}T11:00:00`,
            endTime: `${date.toISOString().split("T")[0]}T12:00:00`,
            reason: "Procedure",
            status: "Ongoing",
            notes: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            patient: {
              id: "mock-pt-3",
              patientId: "FL/0051/88",
              firstName: "Amara",
              lastName: "Okafor",
              gender: "Female",
              dateOfBirth: "1990-07-14",
              phone: "2348076666666",
              category: "Corporate",
              status: "active",
              registrationDate: new Date().toISOString(),
            } as any,
            doctor: {
              id: "mock-doc-2",
              fullName: "Dr. Okafor",
              email: "okafor@example.com",
              role: "Doctor",
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as any,
          },
        ];
        return mock;
      }
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
}

export function useDoctors() {
  return useQuery<DoctorSlot[]>({
    queryKey: ["doctors-grid"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("role", "Doctor")
          .eq("status", "active");
        if (error) throw error;
        const results = toCamel(data) as { id: string; fullName: string }[];
        return results.map((d) => ({ id: d.id, name: d.fullName }));
      } catch {
        return [
          { id: "mock-doc-1", name: "Dr. Adebayo" },
          { id: "mock-doc-2", name: "Dr. Okafor" },
          { id: "mock-doc-3", name: "Dr. Musa" },
        ];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePatients(query: string) {
  return useQuery({
    queryKey: ["patients-search", query],
    queryFn: async () => {
      if (!query.trim() || query.trim().length < 2) return [];
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, patient_id, first_name, last_name")
          .or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,patient_id.ilike.%${query}%`
          )
          .limit(8);
        if (error) throw error;
        const results = toCamel(data) as {
          id: string;
          patientId: string;
          firstName: string;
          lastName: string;
        }[];
        return results.length > 0 ? results : [];
      } catch {
        const mockPatients = [
          { id: "mock-pt-1", patientId: "MD/0016/23", firstName: "Jerel Kevin", lastName: "Parocha" },
          { id: "mock-pt-2", patientId: "EG/0042/99", firstName: "Charity", lastName: "Enyioko" },
          { id: "mock-pt-3", patientId: "FL/0051/88", firstName: "Amara", lastName: "Okafor" },
          { id: "mock-pt-4", patientId: "AB/0033/77", firstName: "Chuka", lastName: "Okafor" },
          { id: "mock-pt-5", patientId: "CD/0022/11", firstName: "Ibrahim", lastName: "Musa" },
        ];
        const lower = query.toLowerCase();
        return mockPatients.filter(
          (p) =>
            p.firstName.toLowerCase().includes(lower) ||
            p.lastName.toLowerCase().includes(lower) ||
            p.patientId.toLowerCase().includes(lower)
        );
      }
    },
    enabled: query.trim().length >= 2,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      patientId: string;
      doctorId: string;
      startTime: string;
      endTime: string;
      reason: string;
      status: AppointmentStatus;
    }) => {
      try {
        const { error } = await supabase.from("appointments").insert({
          patient_id: data.patientId,
          doctor_id: data.doctorId,
          start_time: data.startTime,
          end_time: data.endTime,
          reason: data.reason,
          status: data.status,
        });
        if (error) throw error;
      } catch {
        const localKey = "icare_appointments_local";
        const raw = localStorage.getItem(localKey);
        const existing: any[] = raw ? JSON.parse(raw) : [];
        existing.push({
          id: `local-${Date.now()}`,
          patientId: data.patientId,
          doctorId: data.doctorId,
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason,
          status: data.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        localStorage.setItem(localKey, JSON.stringify(existing));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      doctorId?: string;
      startTime?: string;
      endTime?: string;
      reason?: string;
      status?: AppointmentStatus;
      invoiceAmount?: number;
      notes?: string;
    }) => {
      const payload: Record<string, any> = {};
      if (data.doctorId) payload.doctor_id = data.doctorId;
      if (data.startTime) payload.start_time = data.startTime;
      if (data.endTime) payload.end_time = data.endTime;
      if (data.reason) payload.reason = data.reason;
      if (data.status) payload.status = data.status;
      if (data.invoiceAmount !== undefined) payload.invoice_amount = data.invoiceAmount;

      try {
        const { error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } catch {
        const localKey = "icare_appointments_local";
        const raw = localStorage.getItem(localKey);
        const existing: any[] = raw ? JSON.parse(raw) : [];
        const idx = existing.findIndex((a) => a.id === data.id);
        if (idx !== -1) {
          existing[idx] = { ...existing[idx], ...payload, updatedAt: new Date().toISOString() };
          localStorage.setItem(localKey, JSON.stringify(existing));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase.from("appointments").delete().eq("id", id);
        if (error) throw error;
      } catch {
        const localKey = "icare_appointments_local";
        const raw = localStorage.getItem(localKey);
        const existing: any[] = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter((a) => a.id !== id);
        localStorage.setItem(localKey, JSON.stringify(filtered));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useCreateInvoice() {
  return useMutation({
    mutationFn: async (data: {
      patientId: string;
      doctorName: string;
      amount: number;
      appointmentId: string;
    }) => {
      const invNumber = `INV-APT-${Date.now()}`;
      const payload = {
        invoice_number: invNumber,
        patient_id: data.patientId,
        total_amount: data.amount,
        amount_paid: 0,
        balance: data.amount,
        status: "Unpaid",
        source_type: "Consultation",
      };
      try {
        const { data: invoiceData, error } = await supabase
          .from("invoices")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        const invoiceId = invoiceData.id;
        await supabase.from("invoice_items").insert({
          invoice_id: invoiceId,
          description: `Consultation — ${data.doctorName}`,
          quantity: 1,
          unit_price: data.amount,
          total: data.amount,
        });
        await supabase
          .from("appointments")
          .update({ invoice_id: invoiceId, invoice_amount: data.amount })
          .eq("id", data.appointmentId);
        return invoiceId;
      } catch {
        const localKey = "icare_billing_local";
        const raw = localStorage.getItem(localKey);
        const existing: any[] = raw ? JSON.parse(raw) : [];
        existing.push({
          id: `local-inv-${Date.now()}`,
          invoiceNumber: invNumber,
          patientId: data.patientId,
          totalAmount: data.amount,
          amountPaid: 0,
          balance: data.amount,
          status: "Unpaid",
          sourceType: "Consultation",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        localStorage.setItem(localKey, JSON.stringify(existing));
        return null;
      }
    },
  });
}

export function detectConflicts(appointments: Appointment[]): Set<string> {
  const conflicts = new Set<string>();
  const byDoctor = new Map<string, Appointment[]>();
  for (const apt of appointments) {
    const existing = byDoctor.get(apt.doctorId) || [];
    existing.push(apt);
    byDoctor.set(apt.doctorId, existing);
  }
  for (const [, apts] of byDoctor) {
    for (let i = 0; i < apts.length; i++) {
      for (let j = i + 1; j < apts.length; j++) {
        const a = apts[i];
        const b = apts[j];
        if (
          new Date(a.startTime) < new Date(b.endTime) &&
          new Date(a.endTime) > new Date(b.startTime)
        ) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
  }
  return conflicts;
}

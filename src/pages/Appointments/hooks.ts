import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentTenantId, supabase, toCamel } from "@/src/lib/supabase";
import { adminSupabase } from "@/src/lib/adminSupabase";
import { logAudit } from "@/src/lib/auditLogger";
import type { Appointment, AppointmentStatus } from "@/src/lib/types";
import { toast } from "sonner";
import { useTenant } from "@/src/context/TenantContext";

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
      const { data, error } = await (supabase as any)
        .from("appointments")
        .select("*, patient:patients(*)")
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString())
        .order("start_time", { ascending: true });
      if (error) {
        console.error("Failed to fetch appointments:", error);
        return [];
      }
      return toCamel(data) as Appointment[];
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
}

export function useDoctors(enabled = true) {
  const { tenant } = useTenant();
  const tenantId = tenant?.tenantId || getCurrentTenantId();

  return useQuery<DoctorSlot[]>({
    queryKey: ["doctors-grid", tenantId],
    queryFn: async () => {
      const [usersResult, staffResult] = await Promise.allSettled([
        adminSupabase
          .from("users")
          .select("id, full_name")
          .eq("role", "Doctor")
          .eq("status", "active"),
        (adminSupabase as any)
          .from("staff")
          .select("staff_id, name, auth_user_id")
          .eq("is_clinician", true)
          .neq("availability_status", "On Leave"),
      ]);

      const doctorMap = new Map<string, string>();

      if (usersResult.status === "fulfilled") {
        if (usersResult.value.error) {
          console.error("Failed to fetch user doctors:", usersResult.value.error);
        }
        const doctors = toCamel(usersResult.value.data || []) as { id: string; fullName: string }[];
        for (const d of doctors) {
          doctorMap.set(d.id, d.fullName);
        }
      } else {
        console.error("Failed to fetch user doctors:", usersResult.reason);
      }

      if (staffResult.status === "fulfilled") {
        if (staffResult.value.error) {
          console.error("Failed to fetch staff clinicians:", staffResult.value.error);
        }
        const staff = toCamel(staffResult.value.data || []) as { staffId: string; name: string; authUserId: string | null }[];
        for (const s of staff) {
          const id = s.authUserId || s.staffId;
          if (!doctorMap.has(id)) {
            doctorMap.set(id, s.name);
          }
        }
      } else {
        console.error("Failed to fetch staff clinicians:", staffResult.reason);
      }

      return Array.from(doctorMap.entries()).map(([id, name]) => ({ id, name }));
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    enabled: enabled && !!tenantId,
  });
}

export function usePatients(query: string) {
  return useQuery({
    queryKey: ["patients-search", query],
    queryFn: async () => {
      if (!query.trim() || query.trim().length < 2) return [];
      const { data, error } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name")
        .or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,patient_id.ilike.%${query}%`
        )
        .limit(8);
      if (error) {
        console.error("Failed to search patients:", error);
        return [];
      }
      const results = toCamel(data) as {
        id: string;
        patientId: string;
        firstName: string;
        lastName: string;
      }[];
      return results;
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
      const { error } = await (adminSupabase as any).from("appointments").insert({
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        start_time: data.startTime,
        end_time: data.endTime,
        reason: data.reason,
        status: data.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment created successfully");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "all"] });
      logAudit("Booked appointment", "Appointment");
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
      if (data.reason !== undefined) payload.reason = data.reason;
      if (data.status) payload.status = data.status;
      if (data.invoiceAmount !== undefined) payload.invoice_amount = data.invoiceAmount;
      if (data.notes !== undefined) payload.notes = data.notes;

      console.log("[useUpdateAppointment] payload:", payload, "id:", data.id);
      const { error } = await (adminSupabase as any)
        .from("appointments")
        .update(payload)
        .eq("id", data.id);
      console.log("[useUpdateAppointment] error:", error);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment updated successfully");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "all"] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (adminSupabase as any).from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments", "all"] });
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
      const { data: invoiceData, error } = await (adminSupabase as any)
        .from("invoices")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      const invoiceId = invoiceData.id;
      await (adminSupabase as any).from("invoice_items").insert({
        invoice_id: invoiceId,
        description: `Consultation — ${data.doctorName}`,
        quantity: 1,
        unit_price: data.amount,
        total: data.amount,
      });
      await (adminSupabase as any)
        .from("appointments")
        .update({ invoice_id: invoiceId, invoice_amount: data.amount })
        .eq("id", data.appointmentId);
      return invoiceId;
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

export function findConflicts(
  existingAppointments: Appointment[],
  doctorId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Appointment[] {
  return existingAppointments.filter((apt) => {
    if (excludeId && apt.id === excludeId) return false;
    if (apt.doctorId !== doctorId) return false;
    return new Date(apt.startTime) < new Date(endTime) && new Date(apt.endTime) > new Date(startTime);
  });
}

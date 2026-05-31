import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { adminSupabase } from "@/src/lib/adminSupabase";
import type { GlobalFilters, ClinicalMetrics, StaffMetrics, DrillDownRecord, DrillDownColumn, MetricKey } from "./types";

function trend(direction: "up" | "down" | "neutral", value: string) {
  return { direction, value };
}

function getDefaultFilters(): GlobalFilters {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return {
    dateFrom: thirtyDaysAgo.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
    department: "all",
  };
}

const MOCK_CLINICAL: ClinicalMetrics = {
  bedOccupancyRate: 78,
  bedOccupancyTrend: trend("up", "+5% vs last week"),
  newRegistrationsToday: 24,
  newRegistrationsTrend: trend("up", "+12% vs yesterday"),
  averageLengthOfStay: 4.3,
  alosTrend: trend("down", "-0.5 days vs last month"),
};

const MOCK_STAFF: StaffMetrics = {
  activePersonnel: 142,
  activePersonnelTrend: trend("up", "+8 vs yesterday"),
  consultationsToday: 87,
  consultationsTrend: trend("up", "+15% vs same day last week"),
  taskCompletionRate: 94,
  taskCompletionTrend: trend("up", "+2% this week"),
};

function mockDrillDownData(metricKey: MetricKey): DrillDownRecord[] {
  switch (metricKey) {
    case "bed-occupancy":
      return [
        { id: "1", ward: "General Ward A", total: 40, occupied: 36, rate: 90, type: "General" },
        { id: "2", ward: "General Ward B", total: 30, occupied: 24, rate: 80, type: "General" },
        { id: "3", ward: "Semi-Private", total: 20, occupied: 15, rate: 75, type: "Semi-Private" },
        { id: "4", ward: "Private Suite", total: 12, occupied: 8, rate: 67, type: "Private" },
        { id: "5", ward: "ICU", total: 10, occupied: 9, rate: 90, type: "ICU" },
        { id: "6", ward: "Emergency Ward", total: 15, occupied: 10, rate: 67, type: "Emergency" },
      ];
    case "new-registrations":
      return [
        { id: "1", time: "08:15 AM", name: "Amara Okafor", category: "Individual", folderNumber: "PAT001" },
        { id: "2", time: "08:45 AM", name: "Chidi Nwosu", category: "Family", folderNumber: "ADEBAYO-001" },
        { id: "3", time: "09:00 AM", name: "Folake Adeleke", category: "Corporate", folderNumber: "PAT004" },
        { id: "4", time: "09:30 AM", name: "Emeka Eze", category: "HMO", folderNumber: "PAT006" },
        { id: "5", time: "10:00 AM", name: "Ngozi Obi", category: "Individual", folderNumber: "PAT007" },
        { id: "6", time: "10:30 AM", name: "Tunde Balogun", category: "Corporate", folderNumber: "OKAFOR-001" },
        { id: "7", time: "11:00 AM", name: "Chioma Edeh", category: "Individual", folderNumber: "PAT002" },
        { id: "8", time: "11:30 AM", name: "Kayode Akinwande", category: "Family", folderNumber: "ADEBAYO-002" },
      ];
    case "alos":
      return [
        { id: "1", department: "Internal Medicine", patientCount: 48, avgStay: 5.2, bedDays: 250 },
        { id: "2", department: "Surgery", patientCount: 32, avgStay: 6.8, bedDays: 218 },
        { id: "3", department: "Pediatrics", patientCount: 25, avgStay: 3.1, bedDays: 78 },
        { id: "4", department: "OB/GYN", patientCount: 40, avgStay: 2.8, bedDays: 112 },
        { id: "5", department: "Orthopedics", patientCount: 18, avgStay: 7.5, bedDays: 135 },
        { id: "6", department: "Cardiology", patientCount: 22, avgStay: 6.1, bedDays: 134 },
      ];
    case "active-personnel":
      return [
        { id: "1", name: "Dr. Emeka Okafor", role: "Physician", department: "Internal Medicine", status: "On Duty" },
        { id: "2", name: "Dr. Amina Bello", role: "Physician", department: "Pediatrics", status: "On Duty" },
        { id: "3", name: "Nurse Grace Okonkwo", role: "RN", department: "Surgical Ward", status: "On Duty" },
        { id: "4", name: "Nurse Fatima Usman", role: "RN", department: "ICU", status: "On Duty" },
        { id: "5", name: "Dr. Chidi Eze", role: "Surgeon", department: "Surgery", status: "In Surgery" },
        { id: "6", name: "Lab Tech. Samuel Ade", role: "Lab Technician", department: "Laboratory", status: "On Duty" },
        { id: "7", name: "Nurse Blessing John", role: "RN", department: "Maternity", status: "Break" },
        { id: "8", name: "Dr. Yetunde Adeyemi", role: "Physician", department: "OB/GYN", status: "On Duty" },
      ];
    case "consultations":
      return [
        { id: "1", doctor: "Dr. Emeka Okafor", patients: 12, department: "Internal Medicine", avgTime: "18 min", pending: 3 },
        { id: "2", doctor: "Dr. Amina Bello", patients: 10, department: "Pediatrics", avgTime: "22 min", pending: 2 },
        { id: "3", doctor: "Dr. Yetunde Adeyemi", patients: 8, department: "OB/GYN", avgTime: "20 min", pending: 4 },
        { id: "4", doctor: "Dr. Chidi Eze", patients: 6, department: "Surgery", avgTime: "35 min", pending: 1 },
        { id: "5", doctor: "Dr. Kunle Okonkwo", patients: 14, department: "Family Medicine", avgTime: "15 min", pending: 5 },
        { id: "6", doctor: "Dr. Bose Adeleke", patients: 9, department: "Cardiology", avgTime: "25 min", pending: 2 },
      ];
    case "task-completion":
      return [
        { id: "lab", category: "Lab Tests", total: 50, completed: 42, pending: 8, rate: 84 },
        { id: "pharm", category: "Prescriptions", total: 120, completed: 108, pending: 12, rate: 90 },
        { id: "rad", category: "Radiology", total: 30, completed: 27, pending: 3, rate: 90 },
        { id: "overall", category: "Overall", total: 200, completed: 177, pending: 23, rate: 88 },
      ];
  }
}

const metricColumnMap: Record<MetricKey, DrillDownColumn[]> = {
  "bed-occupancy": [
    { key: "ward", label: "Ward" },
    { key: "total", label: "Total Beds", format: "number" },
    { key: "occupied", label: "Occupied", format: "number" },
    { key: "rate", label: "Occupancy Rate", format: "percentage" },
    { key: "type", label: "Type" },
  ],
  "new-registrations": [
    { key: "time", label: "Time", format: "date" },
    { key: "name", label: "Patient Name" },
    { key: "category", label: "Category" },
    { key: "folderNumber", label: "Folder No" },
  ],
  "alos": [
    { key: "department", label: "Department" },
    { key: "patientCount", label: "Patients", format: "number" },
    { key: "avgStay", label: "Avg Stay (Days)", format: "number" },
    { key: "bedDays", label: "Total Bed Days", format: "number" },
  ],
  "active-personnel": [
    { key: "name", label: "Name" },
    { key: "role", label: "Role" },
    { key: "department", label: "Department" },
    { key: "status", label: "Status", format: "status" },
  ],
  "consultations": [
    { key: "doctor", label: "Doctor" },
    { key: "patients", label: "Patients Seen", format: "number" },
    { key: "department", label: "Department" },
    { key: "avgTime", label: "Avg Time" },
    { key: "pending", label: "Pending", format: "number" },
  ],
  "task-completion": [
    { key: "category", label: "Category" },
    { key: "total", label: "Total", format: "number" },
    { key: "completed", label: "Completed", format: "number" },
    { key: "pending", label: "Pending", format: "number" },
    { key: "rate", label: "Completion %", format: "percentage" },
  ],
};

export function getMetricColumns(metricKey: MetricKey): DrillDownColumn[] {
  return metricColumnMap[metricKey];
}

function computeTrend(current: number, previous: number, label: string): { direction: "up" | "down" | "neutral"; value: string } {
  if (previous === 0) return { direction: "neutral", value: "No prior data" };
  const diff = current - previous;
  const pctChange = Math.round((diff / previous) * 100);
  if (pctChange > 5) return { direction: "up", value: `+${pctChange}% ${label}` };
  if (pctChange < -5) return { direction: "down", value: `${pctChange}% ${label}` };
  return { direction: "neutral", value: "Stable" };
}

export function useReportsDashboard(filters?: GlobalFilters) {
  const f = filters ?? getDefaultFilters();
  return useQuery({
    queryKey: ["reports", "dashboard", f],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

        const { count: registrations } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .gte("registration_date", today);

        const { count: regYesterday } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .gte("registration_date", yesterday)
          .lt("registration_date", today);

        const { count: admissions } = await supabase
          .from("admissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "Admitted");

        const { count: totalBeds } = await supabase
          .from("beds")
          .select("*", { count: "exact", head: true });

        const occupancyRate = totalBeds && totalBeds > 0 ? Math.round(((admissions ?? 0) / totalBeds) * 100) : MOCK_CLINICAL.bedOccupancyRate;

        // ALOS: average length of stay for discharged patients
        let averageLengthOfStay = MOCK_CLINICAL.averageLengthOfStay;
        try {
          const { data: alosRows } = await supabase
            .from("admissions")
            .select("admission_date, discharge:discharges(discharge_date)")
            .eq("status", "Discharged")
            .limit(100);
          if (alosRows && alosRows.length > 0) {
            const days = (alosRows as any[]).map((a: any) => {
              const admission = new Date(a.admission_date);
              const discharge = a.discharge?.[0] ? new Date(a.discharge[0].discharge_date) : new Date();
              return (discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24);
            }).filter((d: number) => d >= 0);
            if (days.length > 0) {
              averageLengthOfStay = Math.round((days.reduce((a: number, b: number) => a + b, 0) / days.length) * 10) / 10;
            }
          }
        } catch { /* keep fallback */ }

        const clinical: ClinicalMetrics = {
          bedOccupancyRate: occupancyRate,
          bedOccupancyTrend: computeTrend(occupancyRate, MOCK_CLINICAL.bedOccupancyRate, "vs last snapshot"),
          newRegistrationsToday: registrations ?? MOCK_CLINICAL.newRegistrationsToday,
          newRegistrationsTrend: computeTrend(registrations ?? 0, regYesterday ?? 0, "vs yesterday"),
          averageLengthOfStay,
          alosTrend: computeTrend(averageLengthOfStay, MOCK_CLINICAL.averageLengthOfStay, "vs baseline"),
        };

        const { count: activeStaff } = await adminSupabase
          .from("staff")
          .select("*", { count: "exact", head: true })
          .eq("availability_status", "Active");

        const { count: consultsToday } = await supabase
          .from("consultations")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today);

        const { count: consultsYesterday } = await supabase
          .from("consultations")
          .select("*", { count: "exact", head: true })
          .gte("created_at", yesterday)
          .lt("created_at", today);

        // Task completion — composite of lab, pharmacy, radiology
        let taskCompletionRate = MOCK_STAFF.taskCompletionRate;
        try {
          const { count: totalLab } = await supabase
            .from("lab_requests")
            .select("*", { count: "exact", head: true });
          const { count: completedLab } = await supabase
            .from("lab_results")
            .select("*", { count: "exact", head: true });
          const { count: totalPharm } = await supabase
            .from("prescriptions")
            .select("*", { count: "exact", head: true });
          const { count: completedPharm } = await supabase
            .from("prescriptions")
            .select("*", { count: "exact", head: true })
            .in("status", ["Dispensed", "PartiallyDispensed"]);
          const { count: totalRad } = await supabase
            .from("radiology_requests")
            .select("*", { count: "exact", head: true });
          const { count: completedRad } = await supabase
            .from("radiology_results")
            .select("*", { count: "exact", head: true });

          const labRate = totalLab && totalLab > 0 ? ((completedLab ?? 0) / totalLab) * 100 : 0;
          const pharmRate = totalPharm && totalPharm > 0 ? ((completedPharm ?? 0) / totalPharm) * 100 : 0;
          const radRate = totalRad && totalRad > 0 ? ((completedRad ?? 0) / totalRad) * 100 : 0;
          if (totalLab || totalPharm || totalRad) {
            taskCompletionRate = Math.round((labRate + pharmRate + radRate) / 3);
          }
        } catch { /* keep fallback */ }

        const staff: StaffMetrics = {
          activePersonnel: activeStaff ?? MOCK_STAFF.activePersonnel,
          activePersonnelTrend: computeTrend(activeStaff ?? 0, MOCK_STAFF.activePersonnel, "vs baseline"),
          consultationsToday: consultsToday ?? MOCK_STAFF.consultationsToday,
          consultationsTrend: computeTrend(consultsToday ?? 0, consultsYesterday ?? 0, "vs yesterday"),
          taskCompletionRate,
          taskCompletionTrend: computeTrend(taskCompletionRate, MOCK_STAFF.taskCompletionRate, "vs baseline"),
        };

        return { clinical, staff };
      } catch {
        return { clinical: MOCK_CLINICAL, staff: MOCK_STAFF };
      }
    },
    staleTime: 30_000,
  });
}

export function useDrillDownData(metricKey: MetricKey, filters?: GlobalFilters) {
  const f = filters ?? getDefaultFilters();
  return useQuery({
    queryKey: ["reports", "drilldown", metricKey, f],
    queryFn: async () => {
      try {
        switch (metricKey) {
          case "bed-occupancy": {
            const { data } = await supabase
              .from("wards")
              .select("id, name, type, beds_count, beds!inner(id, status)")
              .order("name");
            if (data && data.length > 0) {
              return (data as any[]).map((w: any) => ({
                id: w.id,
                ward: w.name,
                total: w.beds_count,
                occupied: (w.beds ?? []).filter((b: any) => b.status === "Occupied").length,
                rate: w.beds_count > 0 ? Math.round(((w.beds ?? []).filter((b: any) => b.status === "Occupied").length / w.beds_count) * 100) : 0,
                type: w.type,
              }));
            }
            break;
          }
          case "new-registrations": {
            const { data } = await supabase
              .from("patients")
              .select("id, patient_id, first_name, last_name, registration_date, category")
              .order("registration_date", { ascending: false })
              .limit(20);
            if (data && data.length > 0) {
              return (data as any[]).map((p: any) => ({
                id: p.id,
                time: new Date(p.registration_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                name: `${p.first_name} ${p.last_name}`,
                category: p.category ?? "Individual",
                folderNumber: p.patient_id,
              }));
            }
            break;
          }
          case "active-personnel": {
            const { data } = await adminSupabase
              .from("staff")
              .select("staff_id, name, position, department, availability_status")
              .limit(20);
            if (data && data.length > 0) {
              return (data as any[]).map((s: any) => ({
                id: s.staff_id,
                name: s.name,
                role: s.position,
                department: s.department ?? "General",
                status: s.availability_status,
              }));
            }
            break;
          }
          case "consultations": {
            const { data: consultData } = await supabase
              .from("consultations")
              .select("id, doctor_id, created_at, appointment_id, doctor:users!doctor_id(full_name), appointment:appointments!appointment_id(start_time)")
              .gte("created_at", f.dateFrom ?? getDefaultFilters().dateFrom!)
              .lte("created_at", f.dateTo ?? getDefaultFilters().dateTo!)
              .limit(50);
            if (consultData && (consultData as any[]).length > 0) {
              const docMap: Record<string, { name: string; count: number; totalMin: number }> = {};
              for (const c of consultData as any[]) {
                const docId = c.doctor_id;
                if (!docMap[docId]) {
                  docMap[docId] = { name: c.doctor?.full_name ?? "Unknown", count: 0, totalMin: 0 };
                }
                docMap[docId].count++;
                if (c.appointment?.start_time) {
                  const start = new Date(c.appointment.start_time);
                  const end = new Date(c.created_at);
                  const diffMin = (end.getTime() - start.getTime()) / (1000 * 60);
                  if (diffMin > 0 && diffMin < 1440) {
                    docMap[docId].totalMin += diffMin;
                  }
                }
              }
              return Object.entries(docMap).map(([id, d]) => ({
                id,
                doctor: d.name,
                patients: d.count,
                department: "General",
                avgTime: d.count > 0 ? `${Math.round(d.totalMin / d.count)} min` : "—",
                pending: 0,
              }));
            }
            break;
          }
          case "alos": {
            const { data: alosRows } = await supabase
              .from("admissions")
              .select("id, admission_date, discharge:discharges(discharge_date)")
              .eq("status", "Discharged")
              .limit(100);
            if (alosRows && alosRows.length > 0) {
              const deptMap: Record<string, { patients: number; totalDays: number }> = {};
              for (const a of alosRows as any[]) {
                const dept = "All Discharged";
                if (!deptMap[dept]) deptMap[dept] = { patients: 0, totalDays: 0 };
                deptMap[dept].patients++;
                const admission = new Date(a.admission_date);
                const discharge = a.discharge?.[0] ? new Date(a.discharge[0].discharge_date) : new Date();
                const days = (discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24);
                if (days >= 0) deptMap[dept].totalDays += days;
              }
              return Object.entries(deptMap).map(([dept, d]) => ({
                id: dept,
                department: dept,
                patientCount: d.patients,
                avgStay: Math.round((d.totalDays / d.patients) * 10) / 10,
                bedDays: Math.round(d.totalDays),
              }));
            }
            break;
          }
          case "task-completion": {
            const [labTotal, labCompleted, pharmTotal, pharmCompleted, radTotal, radCompleted] = await Promise.all([
              supabase.from("lab_requests").select("*", { count: "exact", head: true }),
              supabase.from("lab_results").select("*", { count: "exact", head: true }),
              supabase.from("prescriptions").select("*", { count: "exact", head: true }),
              supabase.from("prescriptions").select("*", { count: "exact", head: true }).in("status", ["Dispensed", "PartiallyDispensed"]),
              supabase.from("radiology_requests").select("*", { count: "exact", head: true }),
              supabase.from("radiology_results").select("*", { count: "exact", head: true }),
            ]);
            const labTotalC = labTotal.count ?? 0;
            const labCompC = labCompleted.count ?? 0;
            const pharmTotalC = pharmTotal.count ?? 0;
            const pharmCompC = pharmCompleted.count ?? 0;
            const radTotalC = radTotal.count ?? 0;
            const radCompC = radCompleted.count ?? 0;
            const labPct = labTotalC > 0 ? Math.round((labCompC / labTotalC) * 100) : 0;
            const pharmPct = pharmTotalC > 0 ? Math.round((pharmCompC / pharmTotalC) * 100) : 0;
            const radPct = radTotalC > 0 ? Math.round((radCompC / radTotalC) * 100) : 0;
            if (labTotalC > 0 || pharmTotalC > 0 || radTotalC > 0) {
              return [
                { id: "lab", category: "Lab Tests", total: labTotalC, completed: labCompC, pending: labTotalC - labCompC, rate: labPct },
                { id: "pharm", category: "Prescriptions", total: pharmTotalC, completed: pharmCompC, pending: pharmTotalC - pharmCompC, rate: pharmPct },
                { id: "rad", category: "Radiology", total: radTotalC, completed: radCompC, pending: radTotalC - radCompC, rate: radPct },
                { id: "overall", category: "Overall", total: labTotalC + pharmTotalC + radTotalC, completed: labCompC + pharmCompC + radCompC, pending: (labTotalC + pharmTotalC + radTotalC) - (labCompC + pharmCompC + radCompC), rate: Math.round((labPct + pharmPct + radPct) / 3) },
              ];
            }
            break;
          }
        }
      } catch {
      }
      return mockDrillDownData(metricKey);
    },
    staleTime: 30_000,
  });
}

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[parseInt(key.split("-")[1], 10) - 1] || key;
}

export function useOccupancyTrend() {
  return useQuery({
    queryKey: ["reports", "occupancy-trend"],
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1);

      const { data: admissions } = await supabase
        .from("admissions")
        .select("admission_date")
        .gte("admission_date", twelveMonthsAgo.toISOString());

      const monthAdmissions: Record<string, number> = {};
      for (const a of (admissions as any[]) || []) {
        const key = getMonthKey(new Date(a.admission_date));
        monthAdmissions[key] = (monthAdmissions[key] || 0) + 1;
      }

      const { count: totalBeds } = await supabase
        .from("beds")
        .select("*", { count: "exact", head: true });

      const result: { month: string; rate: number; admissions: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = getMonthKey(d);
        const admCount = monthAdmissions[key] || 0;
        const rate = totalBeds && totalBeds > 0 ? Math.round((admCount / totalBeds) * 100) : 0;
        result.push({ month: getMonthLabel(key), rate, admissions: admCount });
      }
      return result;
    },
    staleTime: 60_000,
  });
}

export function useAlosDeptData() {
  return useQuery({
    queryKey: ["reports", "alos-dept"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("admissions")
        .select("admission_date, discharge:discharges(discharge_date)")
        .eq("status", "Discharged")
        .limit(200);

      if (!rows || rows.length === 0) return [];

      const deptMap: Record<string, { patients: number; totalDays: number }> = {};
      for (const a of rows as any[]) {
        const dept = "All Discharged";
        if (!deptMap[dept]) deptMap[dept] = { patients: 0, totalDays: 0 };
        deptMap[dept].patients++;
        const admission = new Date(a.admission_date);
        const discharge = a.discharge?.[0] ? new Date(a.discharge[0].discharge_date) : new Date();
        const days = (discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0) deptMap[dept].totalDays += days;
      }

      return Object.entries(deptMap).map(([dept, d]) => ({
        department: dept,
        alos: Math.round((d.totalDays / d.patients) * 10) / 10,
      }));
    },
    staleTime: 60_000,
  });
}

export function useConsultationTrend() {
  return useQuery({
    queryKey: ["reports", "consultation-trend"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: consults } = await supabase
        .from("consultations")
        .select("doctor_id, created_at")
        .gte("created_at", sevenDaysAgo.toISOString());

      const dayMap: Record<string, { consultations: number; doctors: Set<string> }> = {};
      for (const c of (consults as any[]) || []) {
        const d = new Date(c.created_at);
        const key = d.toLocaleDateString("en-US", { weekday: "short" });
        if (!dayMap[key]) dayMap[key] = { consultations: 0, doctors: new Set() };
        dayMap[key].consultations++;
        if (c.doctor_id) dayMap[key].doctors.add(c.doctor_id);
      }

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((day) => ({
        day,
        consultations: dayMap[day]?.consultations || 0,
        doctors: dayMap[day]?.doctors.size || 0,
      }));
    },
    staleTime: 60_000,
  });
}

export function useStaffAvailability() {
  return useQuery({
    queryKey: ["reports", "staff-availability"],
    queryFn: async () => {
      const { data: staff } = await adminSupabase
        .from("staff")
        .select("availability_status");

      const statusCount: Record<string, number> = {};
      for (const s of (staff as any[]) || []) {
        const status = s.availability_status || "Unknown";
        statusCount[status] = (statusCount[status] || 0) + 1;
      }

      const total = Object.values(statusCount).reduce((a: number, b: number) => a + b, 0) || 1;
      return Object.entries(statusCount).map(([name, value]) => ({
        name,
        value: Math.round((value / total) * 100),
      }));
    },
    staleTime: 60_000,
  });
}

export function useClinicalMetrics(filters?: GlobalFilters) {
  const dashboard = useReportsDashboard(filters);
  return {
    ...dashboard,
    data: dashboard.data?.clinical ?? null,
  };
}

export function useStaffMetrics(filters?: GlobalFilters) {
  const dashboard = useReportsDashboard(filters);
  return {
    ...dashboard,
    data: dashboard.data?.staff ?? null,
  };
}

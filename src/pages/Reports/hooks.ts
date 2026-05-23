import { useQuery } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
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
        { id: "1", date: "2026-05-23", time: "08:15 AM", name: "Amara Okafor", category: "Individual", lastVisit: "2026-05-20" },
        { id: "2", date: "2026-05-23", time: "08:45 AM", name: "Chidi Nwosu", category: "Family", lastVisit: "2026-05-22" },
        { id: "3", date: "2026-05-23", time: "09:00 AM", name: "Folake Adeleke", category: "Corporate", lastVisit: "—" },
        { id: "4", date: "2026-05-23", time: "09:30 AM", name: "Emeka Eze", category: "HMO", lastVisit: "2026-05-18" },
        { id: "5", date: "2026-05-22", time: "10:00 AM", name: "Ngozi Obi", category: "Individual", lastVisit: "2026-05-15" },
        { id: "6", date: "2026-05-22", time: "10:30 AM", name: "Tunde Balogun", category: "Corporate", lastVisit: "—" },
        { id: "7", date: "2026-05-22", time: "11:00 AM", name: "Chioma Edeh", category: "Individual", lastVisit: "2026-05-21" },
        { id: "8", date: "2026-05-22", time: "11:30 AM", name: "Kayode Akinwande", category: "Family", lastVisit: "2026-05-19" },
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
        { id: "1", nurse: "Nurse Grace Okonkwo", vitalsDue: 12, vitalsDone: 12, marDue: 18, marDone: 17, overall: 97 },
        { id: "2", nurse: "Nurse Fatima Usman", vitalsDue: 8, vitalsDone: 8, marDue: 14, marDone: 14, overall: 100 },
        { id: "3", nurse: "Nurse Blessing John", vitalsDue: 10, vitalsDone: 9, marDue: 16, marDone: 14, overall: 88 },
        { id: "4", nurse: "Nurse Musa Ibrahim", vitalsDue: 14, vitalsDone: 12, marDue: 20, marDone: 18, overall: 88 },
        { id: "5", nurse: "Nurse Chioma Obi", vitalsDue: 6, vitalsDone: 6, marDue: 10, marDone: 10, overall: 100 },
        { id: "6", nurse: "Nurse Patricia Edeh", vitalsDue: 10, vitalsDone: 9, marDue: 15, marDone: 14, overall: 92 },
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
    { key: "date", label: "Date of Registration" },
    { key: "time", label: "Time" },
    { key: "name", label: "Patient Name" },
    { key: "category", label: "Category" },
    { key: "lastVisit", label: "Date of Last Visit" },
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
    { key: "nurse", label: "Nurse" },
    { key: "vitalsDue", label: "Vitals Due", format: "number" },
    { key: "vitalsDone", label: "Vitals Done", format: "number" },
    { key: "marDue", label: "MAR Due", format: "number", tooltip: "Medication doses scheduled to be administered" },
    { key: "marDone", label: "MAR Done", format: "number", tooltip: "Medication doses actually administered" },
    { key: "overall", label: "Completion %", format: "percentage" },
  ],
};

export function getMetricColumns(metricKey: MetricKey): DrillDownColumn[] {
  return metricColumnMap[metricKey];
}

export function useReportsDashboard(filters?: GlobalFilters) {
  const f = filters ?? getDefaultFilters();
  return useQuery({
    queryKey: ["reports", "dashboard", f],
    queryFn: async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { count: registrations } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .gte("registration_date", today);

        const { count: admissions } = await supabase
          .from("admissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "Admitted");

        const { count: totalBeds } = await supabase
          .from("beds")
          .select("*", { count: "exact", head: true });

        const occupancyRate = totalBeds && totalBeds > 0 ? Math.round(((admissions ?? 0) / totalBeds) * 100) : MOCK_CLINICAL.bedOccupancyRate;

        const clinical: ClinicalMetrics = {
          bedOccupancyRate: occupancyRate,
          bedOccupancyTrend: MOCK_CLINICAL.bedOccupancyTrend,
          newRegistrationsToday: registrations ?? MOCK_CLINICAL.newRegistrationsToday,
          newRegistrationsTrend: MOCK_CLINICAL.newRegistrationsTrend,
          averageLengthOfStay: MOCK_CLINICAL.averageLengthOfStay,
          alosTrend: MOCK_CLINICAL.alosTrend,
        };

        const { count: activeStaff } = await supabase
          .from("staff")
          .select("*", { count: "exact", head: true })
          .eq("availability_status", "Active");

        const { count: consultsToday } = await supabase
          .from("consultations")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today);

        const staff: StaffMetrics = {
          activePersonnel: activeStaff ?? MOCK_STAFF.activePersonnel,
          activePersonnelTrend: MOCK_STAFF.activePersonnelTrend,
          consultationsToday: consultsToday ?? MOCK_STAFF.consultationsToday,
          consultationsTrend: MOCK_STAFF.consultationsTrend,
          taskCompletionRate: MOCK_STAFF.taskCompletionRate,
          taskCompletionTrend: MOCK_STAFF.taskCompletionTrend,
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
              .select("id, first_name, last_name, registration_date, category")
              .order("registration_date", { ascending: false })
              .limit(20);
            if (data && data.length > 0) {
              const patientIds = (data as any[]).map((p: any) => p.id);
              const { data: visits } = await supabase
                .from("consultations")
                .select("patient_id, created_at")
                .in("patient_id", patientIds)
                .order("created_at", { ascending: false });
              const lastVisitMap: Record<string, string> = {};
              if (visits) {
                for (const v of visits as any[]) {
                  if (!lastVisitMap[v.patient_id]) {
                    lastVisitMap[v.patient_id] = new Date(v.created_at).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
                  }
                }
              }
              return (data as any[]).map((p: any) => ({
                id: p.id,
                date: new Date(p.registration_date).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }),
                time: new Date(p.registration_date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                name: `${p.first_name} ${p.last_name}`,
                category: p.category ?? "Individual",
                lastVisit: lastVisitMap[p.id] ?? "—",
              }));
            }
            break;
          }
          case "active-personnel": {
            const { data } = await supabase
              .from("staff")
              .select("staff_id, name, position, department, availability_status")
              .eq("availability_status", "Active")
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
            const { data } = await supabase
              .from("consultations")
              .select("id, doctor_id, created_at, doctor:users!doctor_id(full_name)")
              .gte("created_at", f.dateFrom ?? getDefaultFilters().dateFrom!)
              .lte("created_at", f.dateTo ?? getDefaultFilters().dateTo!)
              .limit(50);
            if (data && data.length > 0) {
              const docMap: Record<string, { name: string; count: number; department: string }> = {};
              for (const c of data as any[]) {
                const docId = c.doctor_id;
                if (!docMap[docId]) {
                  docMap[docId] = { name: c.doctor?.full_name ?? "Unknown", count: 0, department: "General" };
                }
                docMap[docId].count++;
              }
              return Object.entries(docMap).map(([id, d]) => ({
                id,
                doctor: d.name,
                patients: d.count,
                department: d.department,
                avgTime: "20 min",
                pending: 0,
              }));
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

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  Clock, Play, CheckCircle2, Plus, Loader2, AlertCircle, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Pagination from "@/components/ui/pagination";
import ConsultationDetailCard from "@/src/components/ConsultationDetailCard";

const statusConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  VitalsRecorded: { icon: Clock, label: "Vitals Recorded", color: "text-amber-600", bg: "bg-amber-50" },
  InProgress: { icon: Play, label: "In Progress", color: "text-blue-600", bg: "bg-blue-50" },
  Completed: { icon: CheckCircle2, label: "Completed", color: "text-emerald-600", bg: "bg-emerald-50" },
};

const ConsultationList = () => {
  const navigate = useNavigate();
  const { hospital_slug } = useParams();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: consultations, isLoading, isError, error } = useQuery({
    queryKey: ["consultations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["patients-short"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users-short"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name");
      if (error) throw error;
      return toCamel(data);
    },
  });

  const { data: prescriptions } = useQuery({
    queryKey: ["dialog-rx", selectedConsultation?.patientId],
    queryFn: async () => {
      if (!selectedConsultation?.patientId) return [];
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, items:prescription_items(*, medication:medications(name, strength))")
        .eq("patient_id", selectedConsultation.patientId)
        .order("date", { ascending: false });
      if (error) throw error;
      return toCamel(data || []);
    },
    enabled: !!selectedConsultation?.patientId,
  });

  const { data: labRequests } = useQuery({
    queryKey: ["dialog-labs", selectedConsultation?.patientId],
    queryFn: async () => {
      if (!selectedConsultation?.patientId) return [];
      const { data, error } = await supabase
        .from("lab_requests")
        .select("*, test:lab_tests(name, category), results:lab_results(*)")
        .eq("patient_id", selectedConsultation.patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data || []);
    },
    enabled: !!selectedConsultation?.patientId,
  });

  const { data: radiologyRequests } = useQuery({
    queryKey: ["dialog-radiology", selectedConsultation?.patientId],
    queryFn: async () => {
      if (!selectedConsultation?.patientId) return [];
      const { data, error } = await supabase
        .from("radiology_requests")
        .select("*, exam:radiology_exams(name), result:radiology_results(*)")
        .eq("patient_id", selectedConsultation.patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return toCamel(data || []);
    },
    enabled: !!selectedConsultation?.patientId,
  });

  const patientMap = useMemo(() => {
    if (!Array.isArray(patients)) return new Map();
    return new Map(patients.map((p: any) => [p.id, p]));
  }, [patients]);

  const doctorMap = useMemo(() => {
    if (!Array.isArray(users)) return new Map();
    return new Map(users.map((u: any) => [u.id, u]));
  }, [users]);

  const enrichedConsultations = useMemo(() => {
    if (!Array.isArray(consultations)) return [];
    return consultations.map((c: any) => ({
      ...c,
      _patient: patientMap.get(c.patientId || c.patient_id) || null,
      _doctor: doctorMap.get(c.doctorId) || null,
    }));
  }, [consultations, patientMap, doctorMap]);

  const sorted = useMemo(() => {
    const order: Record<string, number> = { VitalsRecorded: 0, InProgress: 1, Completed: 2 };
    return [...enrichedConsultations].sort((a: any, b: any) => {
      const aOrder = a.status && order[a.status] !== undefined ? order[a.status] : 3;
      const bOrder = b.status && order[b.status] !== undefined ? order[b.status] : 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      if (a.status === "VitalsRecorded") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [enrichedConsultations]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sorted.length / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [sorted, pageSize]);

  const handleStartConsultation = useCallback(async (c: any) => {
    const pid = c.patientId || c.patient_id;
    if (c.status === "VitalsRecorded") {
      await supabase.from("consultations").update({ status: "InProgress" }).eq("id", c.id);
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
    }
    navigate(`/${hospital_slug}/consultations/workspace/${pid}`);
  }, [navigate, queryClient]);

  const handleOpenDetails = useCallback((c: any) => {
    setSelectedConsultation(c);
    setDialogOpen(true);
  }, []);

  const sheetRx = useMemo(() => {
    if (!Array.isArray(prescriptions) || !selectedConsultation) return [];
    return prescriptions.filter((rx: any) => rx.consultationId === selectedConsultation.id);
  }, [prescriptions, selectedConsultation]);

  const sheetLabs = useMemo(() => {
    if (!Array.isArray(labRequests) || !selectedConsultation) return [];
    return labRequests.filter((lr: any) => lr.consultationId === selectedConsultation.id);
  }, [labRequests, selectedConsultation]);

  const sheetRad = useMemo(() => {
    if (!Array.isArray(radiologyRequests) || !selectedConsultation) return [];
    return radiologyRequests.filter((rr: any) => rr.consultationId === selectedConsultation.id);
  }, [radiologyRequests, selectedConsultation]);

  if (isLoading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (isError) return (
    <div className="p-12 text-center text-slate-400">
      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-40" />
      <p className="text-sm">{error instanceof Error ? error.message : "Error loading consultations"}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recent Consultations</h1>
          <p className="text-sm text-slate-500">{sorted.length} encounter{sorted.length !== 1 ? "s" : ""}</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/${hospital_slug}/consultations/workspace`)}>
          <Plus className="w-4 h-4 mr-2" /> Start New Consultation
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-slate-400">
          <p>No consultations found.</p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => navigate(`/${hospital_slug}/consultations/workspace`)}>
            <Plus className="w-4 h-4 mr-2" /> Start New Consultation
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left min-w-[200px]">Patient</th>
                  <th className="px-4 py-3 text-left min-w-[140px]">Status</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Date / Time</th>
                  <th className="px-4 py-3 text-left min-w-[120px]">Complaint</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((c: any) => {
                  const patient = c._patient;
                  const s = statusConfig[c.status] || statusConfig.Completed;
                  const StatusIcon = s.icon;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {patient?.firstName?.[0] || ""}{patient?.lastName?.[0] || ""}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm truncate">{patient?.firstName || ""} {patient?.lastName || ""}</div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">{patient?.patientId || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`${s.bg} ${s.color} border-0 font-semibold text-[11px] gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {s.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 max-w-[160px] truncate">
                        {c.chiefComplaint || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold text-slate-500 hover:text-slate-700"
                            onClick={() => handleOpenDetails(c)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Details
                          </Button>
                          {c.status === "VitalsRecorded" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-semibold text-amber-600"
                              onClick={async () => {
                                try { await handleStartConsultation(c); } catch (err) { console.error("Failed to start consultation:", err); }
                              }}
                            >
                              Start
                            </Button>
                          )}
                          {c.status === "InProgress" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-semibold text-blue-600"
                              onClick={() => navigate(`/${hospital_slug}/consultations/workspace/${c.patientId || c.patient_id}`)}
                            >
                              Continue
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} pageSize={pageSize} totalItems={sorted.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consultation Details</DialogTitle>
          </DialogHeader>
          {selectedConsultation && (
            <ConsultationDetailCard
              consultation={selectedConsultation}
              prescriptions={sheetRx}
              labRequests={sheetLabs}
              radiologyRequests={sheetRad}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsultationList;

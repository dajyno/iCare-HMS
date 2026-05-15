import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  Search,
  ChevronDown,
  ArrowLeft,
  Loader2,
  Check,
  Trash2,
  Scan,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { radiologyCategories } from "./RadiologyCategories";
import ChipGrid from "./ChipGrid";

const RadiologyNewExam = ({ onBack }: { onBack: () => void }) => {
  const queryClient = useQueryClient();
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [patientId, setPatientId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [folderNo, setFolderNo] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(radiologyCategories.map((c) => c.id))
  );
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [customSaved, setCustomSaved] = useState<Record<string, string[]>>({});
  const [customInputVisible, setCustomInputVisible] = useState<Record<string, boolean>>({});

  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, patient_id")
        .eq("status", "active")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const toggleExam = useCallback((examName: string) => {
    setSelectedExams((prev) => {
      const next = new Set(prev);
      if (next.has(examName)) next.delete(examName);
      else next.add(examName);
      return next;
    });
  }, []);

  const selectPatient = useCallback(
    (id: string) => {
      setPatientId(id);
      const p = Array.isArray(patients)
        ? patients.find((p: any) => p.id === id)
        : null;
      if (p) {
        setPatientQuery(`${p.firstName} ${p.lastName}`);
        setFolderNo(p.patientId);
      }
    },
    [patients]
  );

  const allSelectedExamNames = useMemo(() => {
    const names = Array.from(selectedExams);
    for (const saved of Object.values(customSaved)) {
      for (const name of saved) {
        if (name.trim()) names.push(name.trim());
      }
    }
    return names;
  }, [selectedExams, customSaved]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveCustom = (catId: string) => {
    const val = customInputs[catId]?.trim();
    if (!val) return;
    setCustomSaved((prev) => {
      const next = { ...prev };
      const list = [...(next[catId] ?? [])];
      if (!list.includes(val)) list.push(val);
      next[catId] = list;
      return next;
    });
    setCustomInputs((prev) => {
      const next = { ...prev };
      delete next[catId];
      return next;
    });
    setCustomInputVisible((prev) => ({ ...prev, [catId]: false }));
  };

  const handleDeleteCustom = (catId: string, idx: number) => {
    setCustomSaved((prev) => {
      const next = { ...prev };
      const list = [...(next[catId] ?? [])];
      list.splice(idx, 1);
      if (list.length > 0) next[catId] = list;
      else delete next[catId];
      return next;
    });
  };

  const generateBatchId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `BATCH-${timestamp}-${random}`.toUpperCase();
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data: allExams } = await supabase
        .from("radiology_exams")
        .select("id, name");
      const existingMap = new Map<string, string>();
      if (allExams) {
        for (const t of allExams) existingMap.set(t.name, t.id);
      }

      const examIdMap = new Map<string, string>();

      for (const name of allSelectedExamNames) {
        if (existingMap.has(name)) {
          examIdMap.set(name, existingMap.get(name)!);
          continue;
        }
        const { data: catData } = await supabase
          .from("radiology_categories")
          .select("id")
          .limit(1);
        const fallbackCatId = catData?.[0]?.id;
        if (fallbackCatId) {
          const { error } = await supabase
            .from("radiology_exams")
            .insert({
              name,
              category_id: fallbackCatId,
              price: 0,
              status: "active",
            })
            .select("id");
          const { data: newExam } = await supabase
            .from("radiology_exams")
            .select("id")
            .eq("name", name)
            .single();
          if (newExam) examIdMap.set(name, newExam.id);
        }
      }

      const batchId = generateBatchId();

      const validRequests = allSelectedExamNames
        .filter((name) => examIdMap.has(name))
        .map((name) => ({
          patient_id: patientId,
          exam_id: examIdMap.get(name),
          folder_no: folderNo || null,
          batch_id: batchId,
          status: "Requested" as const,
        }));

      if (validRequests.length === 0) {
        throw new Error("No examinations could be registered.");
      }

      const { error: reqError } = await supabase
        .from("radiology_requests")
        .insert(validRequests);
      if (reqError) throw reqError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
      onBack();
    },
    onError: (err) => {
      alert("Failed to save: " + err.message);
    },
  });

  const canSubmit = patientId && allSelectedExamNames.length > 0;

  const matchedPatients = useMemo(() => {
    if (!patientQuery || patientId) return [];
    return (Array.isArray(patients) ? patients : []).filter(
      (p: any) =>
        `${p.firstName} ${p.lastName} ${p.patientId}`
          .toLowerCase()
          .includes(patientQuery.toLowerCase())
    ).slice(0, 8);
  }, [patients, patientQuery, patientId]);

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 space-y-6 pb-32">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-700 -ml-2"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="p-1.5 rounded-lg bg-indigo-50">
              <Scan className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">
                New Examination
              </h1>
              <p className="text-[10px] text-slate-500">
                Select imaging exams to order for the patient
              </p>
            </div>
          </div>
        </div>

        {/* Patient Sync - Search by Folder No */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Patient Folder No.
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setPatientId("");
                    setFolderNo("");
                  }}
                  placeholder="Search patient by name, Folder No, or ID..."
                  className="pl-9 h-9 text-sm"
                />
                {patientQuery && !patientId && matchedPatients.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {matchedPatients.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between"
                        onClick={() => selectPatient(p.id)}
                      >
                        <span className="font-medium text-slate-800">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {p.patientId}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {patientId && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-emerald-600 font-medium">
                    {patientQuery}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {folderNo}
                  </span>
                </div>
              )}
              {!patientId && <div className="h-[18px]" />}
            </div>
          </div>
        </div>

        {/* Searchable Chip-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {radiologyCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const catSelectedCount =
              category.exams.filter((t) => selectedExams.has(t)).length +
              (customSaved[category.id]?.length ?? 0);

            return (
              <div
                key={category.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      {category.name}
                    </span>
                    {catSelectedCount > 0 && (
                      <span className="text-[10px] font-bold text-[#005EB8] bg-[#005EB8]/10 px-1.5 py-0.5 rounded">
                        {catSelectedCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 space-y-1.5">
                        {category.exams.map((exam) => (
                          <ChipGrid
                            key={exam}
                            label={exam}
                            selected={selectedExams.has(exam)}
                            onToggle={() => toggleExam(exam)}
                          />
                        ))}
                      </div>

                      {/* Saved custom exams */}
                      {(customSaved[category.id]?.length ?? 0) > 0 && (
                        <div className="px-3 pb-1 space-y-1">
                          {customSaved[category.id]!.map((name, idx) => (
                            <div
                              key={`${name}-${idx}`}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#005EB8]/10 text-[#005EB8] text-[12px] font-medium"
                            >
                              <span className="flex-1">{name}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustom(category.id, idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Custom Category - morphs into input */}
                      <div className="px-3 pb-3">
                        <AnimatePresence mode="wait">
                          {customInputVisible[category.id] ? (
                            <motion.div
                              key="input"
                              initial={{ opacity: 0, scaleY: 0.8, height: 0 }}
                              animate={{ opacity: 1, scaleY: 1, height: "auto" }}
                              exit={{ opacity: 0, scaleY: 0.8, height: 0 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                              }}
                              className="origin-top"
                            >
                              <div className="flex gap-1.5">
                                <Input
                                  value={customInputs[category.id] ?? ""}
                                  onChange={(e) =>
                                    setCustomInputs((prev) => ({
                                      ...prev,
                                      [category.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleSaveCustom(category.id);
                                  }}
                                  placeholder="Enter custom exam name..."
                                  className="h-8 text-xs border-dashed border-slate-300 flex-1"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveCustom(category.id)}
                                  disabled={!customInputs[category.id]?.trim()}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomInputVisible((prev) => ({
                                      ...prev,
                                      [category.id]: false,
                                    }));
                                    setCustomInputs((prev) => {
                                      const next = { ...prev };
                                      delete next[category.id];
                                      return next;
                                    });
                                  }}
                                  className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.button
                              key="add"
                              type="button"
                              onClick={() =>
                                setCustomInputVisible((prev) => ({
                                  ...prev,
                                  [category.id]: true,
                                }))
                              }
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.15 }}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-500 hover:border-[#005EB8] hover:text-[#005EB8] hover:bg-[#005EB8]/5 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              Add Custom Exam
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed Footer */}
      <motion.div
        layout
        className="fixed bottom-0 left-0 md:left-64 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-6"
      >
        {submitMutation.isPending && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="h-0.5 bg-[#005EB8] origin-left"
            style={{ transformOrigin: "left" }}
          />
        )}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {allSelectedExamNames.length}
              </span>
              <span className="text-xs text-slate-500">
                Exam{allSelectedExamNames.length !== 1 ? "s" : ""} Selected
              </span>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
            whileTap={canSubmit ? { scale: 0.95 } : {}}
            className={`relative h-10 px-6 rounded-lg text-xs font-bold tracking-wide uppercase transition-all ${
              canSubmit && !submitMutation.isPending
                ? "bg-[#005EB8] text-white shadow-sm hover:bg-[#004d9a]"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Transmitting...
              </span>
            ) : (
              "Create Request"
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default RadiologyNewExam;

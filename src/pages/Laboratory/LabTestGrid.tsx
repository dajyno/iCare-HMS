import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import {
  Search,
  AlertTriangle,
  ChevronDown,
  FlaskConical,
  ArrowLeft,
  Loader2,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";
import { testCategories, testDictionary } from "./testCategories";
import ToggleTile from "./ToggleTile";

const LabTestGrid = ({ onBack }: { onBack: () => void }) => {
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [patientId, setPatientId] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(testCategories.map((c) => c.id))
  );
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [customSaved, setCustomSaved] = useState<Record<string, string[]>>({});
  const [hormoneValues, setHormoneValues] = useState<Record<string, string>>({});

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

  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .in("role", ["Doctor", "HospitalAdmin", "SuperAdmin"])
        .eq("status", "active")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const toggleTest = useCallback((testName: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(testName)) next.delete(testName);
      else next.add(testName);
      return next;
    });
  }, []);

  const selectPatient = useCallback((id: string) => {
    setPatientId(id);
    const p = Array.isArray(patients) ? patients.find((p: any) => p.id === id) : null;
    if (p) setPatientQuery(`${p.firstName} ${p.lastName}`);
  }, [patients]);

  const allSelectedTestNames = useMemo(() => {
    const names = Array.from(selectedTests);
    for (const saved of Object.values(customSaved)) {
      for (const name of saved) {
        if (name.trim()) names.push(name.trim());
      }
    }
    return names;
  }, [selectedTests, customSaved]);

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

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data: allLabTests } = await supabase
        .from("lab_tests")
        .select("id, name");
      const existingMap = new Map<string, string>();
      if (allLabTests) {
        for (const t of allLabTests) existingMap.set(t.name, t.id);
      }

      const testIdMap = new Map<string, string>();

      for (const name of allSelectedTestNames) {
        if (existingMap.has(name)) {
          testIdMap.set(name, existingMap.get(name)!);
          continue;
        }
        const { data: rpcId } = await supabase
          .rpc("ensure_lab_test", { test_name: name });
        if (rpcId) {
          testIdMap.set(name, rpcId as string);
        }
      }

      const validRequests = allSelectedTestNames
        .filter((name) => testIdMap.has(name))
        .map((name) => ({
          patient_id: patientId,
          test_id: testIdMap.get(name),
          status: "Requested" as const,
        }));

      if (validRequests.length === 0) {
        throw new Error("No tests could be registered. Check that lab tests exist in the database.");
      }

      const { error: reqError } = await supabase
        .from("lab_requests")
        .insert(validRequests);
      if (reqError) throw reqError;
    },
    onSuccess: () => {
      onBack();
    },
    onError: (err) => {
      alert("Failed to save: " + err.message);
    },
  });

  const canSubmit = patientId && allSelectedTestNames.length > 0;

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
            <div className="p-1.5 rounded-lg bg-slate-100">
              <FlaskConical className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">
                New Laboratory Request
              </h1>
              <p className="text-[10px] text-slate-500">
                Select tests to order for the patient
              </p>
            </div>
          </div>
        </div>

        {/* Patient Header — all on one line */}
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
                  }}
                  placeholder="Search patient by name or ID..."
                  className="pl-9 h-9 text-sm"
                />
                {patientQuery && !patientId && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {(Array.isArray(patients) ? patients : [])
                      .filter(
                        (p: any) =>
                          `${p.firstName} ${p.lastName} ${p.patientId}`
                            .toLowerCase()
                            .includes(patientQuery.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((p: any) => (
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
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Patient selected</p>
              )}
              {!patientId && <div className="h-[18px]" />}
            </div>

            <div className="min-w-[180px]">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Referred By
              </Label>
              <SearchableSelect
                value={referredBy}
                onValueChange={setReferredBy}
                placeholder="Select doctor..."
                options={(Array.isArray(doctors) ? doctors : []).map((d: any) => ({
                  value: d.id,
                  label: d.fullName,
                }))}
                triggerClassName="h-9 text-sm"
              />
              <div className="h-[18px]" />
            </div>

            <div className="min-w-[160px]">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Urgency
              </Label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden h-9">
                <button
                  type="button"
                  onClick={() => setUrgency("normal")}
                  className={`flex-1 text-xs font-semibold transition-colors ${
                    urgency === "normal"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency("urgent")}
                  className={`flex-1 text-xs font-semibold transition-colors relative ${
                    urgency === "urgent"
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {urgency === "urgent" && (
                    <motion.span
                      className="absolute inset-0 rounded-r-md"
                      animate={{
                        boxShadow: [
                          "inset 0 0 0 0 rgba(245,158,11,0)",
                          "inset 0 0 12px 2px rgba(245,158,11,0.4)",
                          "inset 0 0 0 0 rgba(245,158,11,0)",
                        ],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}
                  <span className="relative z-10">URGENT</span>
                </button>
              </div>
              <div className="h-[18px]" />
            </div>
          </div>
        </div>

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const catSelectedCount =
              category.tests.filter((t) => selectedTests.has(t)).length +
              (customSaved[category.id]?.length ?? 0);

            return (
              <div
                key={category.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 md:cursor-default"
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
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform md:hidden ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div className={`${!isExpanded ? "hidden md:block" : "block"}`}>
                  <div className="p-3 space-y-1.5">
                    {category.tests.map((test) => (
                      <ToggleTile
                        key={test}
                        label={test}
                        selected={selectedTests.has(test)}
                        onToggle={() => toggleTest(test)}
                      />
                    ))}
                  </div>

                  {/* Saved custom tests */}
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

                  {/* Custom entry with Save + Trash */}
                  <div className="px-3 pb-3">
                    <p className="text-[10px] text-slate-400 mb-1.5 font-medium">
                      — or type a custom test —
                    </p>
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
                          if (e.key === "Enter") handleSaveCustom(category.id);
                        }}
                        placeholder="Enter custom test name..."
                        className="h-8 text-xs border-dashed border-slate-300 flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCustom(category.id)}
                        disabled={!customInputs[category.id]?.trim()}
                        className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hormone Profiles - Specialized Inputs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Hormone Profiles (Specialized)
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {["Infertility Panel", "Obesity Panel", "Thyroid Panel", "Diabetes Panel"].map(
                (panel) => (
                  <div key={panel} className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {panel}
                    </Label>
                    <Input
                      value={hormoneValues[panel] ?? ""}
                      onChange={(e) =>
                        setHormoneValues((prev) => ({
                          ...prev,
                          [panel]: e.target.value,
                        }))
                      }
                      placeholder="Enter values"
                      className="h-9 text-xs"
                      style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer — always visible, starts after sidebar */}
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
                {allSelectedTestNames.length}
              </span>
              <span className="text-xs text-slate-500">
                Test{allSelectedTestNames.length !== 1 ? "s" : ""} Selected
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-[11px] text-slate-500">
              Est. Processing: ~{Math.max(1, Math.ceil(allSelectedTestNames.length / 3))}h
            </span>
            {urgency === "urgent" && (
              <div className="flex items-center gap-1 text-amber-600 text-[11px] font-semibold">
                <AlertTriangle className="w-3 h-3" />
                URGENT
              </div>
            )}
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
              "Store Lab Test"
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default LabTestGrid;

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { computeTotalWithVat } from "../Billing/billingTypes";
import { useGlobalSettings } from "@/src/context/GlobalSettingsContext";
import {
  Search,
  AlertTriangle,
  ChevronDown,
  FlaskConical,
  ArrowLeft,
  Loader2,
  Check,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/ui/searchable-select";
import { testCategories } from "./testCategories";
import ToggleTile from "./ToggleTile";
import { useStaff } from "../Staff/StaffContext";
import { generateInvoiceNumber } from "@/src/lib/invoiceNumber";
import { toast } from "sonner";

const hardcodedTestNames = new Set(testCategories.flatMap((c) => c.tests));

const LabTestGrid = ({ onBack, initialPatientId }: { onBack: () => void; initialPatientId?: string }) => {
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [patientId, setPatientId] = useState(initialPatientId || "");
  const [patientQuery, setPatientQuery] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(testCategories.map((c) => c.id))
  );
  const [customSaved, setCustomSaved] = useState<{ name: string; price: number }[]>([]);
  const [customInputRows, setCustomInputRows] = useState<{ id: string; name: string; price: string }[]>([
    { id: "row-0", name: "", price: "" },
  ]);
  const [hormoneValues, setHormoneValues] = useState<Record<string, string>>({});
  const { settings } = useGlobalSettings();
  const queryClient = useQueryClient();

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

  const { records: staffRecords } = useStaff();
  const doctors = useMemo(
    () => staffRecords
      .filter((r: any) => r.is_clinician && r.availability_status !== "On Leave")
      .map((r: any) => ({ id: r.staff_id, fullName: r.name })),
    [staffRecords]
  );

  const { data: dbLabTests } = useQuery({
    queryKey: ["lab-tests-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_tests")
        .select("id, name, category, price")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  const customDbTests = useMemo(
    () =>
      Array.isArray(dbLabTests)
        ? dbLabTests.filter(
            (t: any) =>
              t?.category !== "Radiology" &&
              t?.name &&
              !hardcodedTestNames.has(t.name)
          )
        : [],
    [dbLabTests]
  );

  useEffect(() => {
    if (customDbTests.length > 0) {
      setExpandedCategories((prev) => new Set(prev).add("custom-tests"));
    }
  }, [customDbTests.length]);

  const [selectedDbTests, setSelectedDbTests] = useState<Set<string>>(new Set());

  const toggleDbTest = useCallback((testId: string) => {
    setSelectedDbTests((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (initialPatientId && Array.isArray(patients)) {
      const match = patients.find((p: any) => p.id === initialPatientId);
      if (match) {
        setPatientId(initialPatientId);
        setPatientQuery(`${match.firstName} ${match.lastName}`);
      }
    }
  }, [initialPatientId, patients]);

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
    for (const item of customSaved) {
      if (item.name.trim()) names.push(item.name.trim());
    }
    if (Array.isArray(dbLabTests)) {
      const dbTestMap = new Map<string, string>();
      for (const t of dbLabTests) dbTestMap.set(t.id, t.name);
      for (const id of selectedDbTests) {
        const name = dbTestMap.get(id);
        if (name) names.push(name);
      }
    }
    return names;
  }, [selectedTests, customSaved, dbLabTests, selectedDbTests]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveCustom = (rowIndex: number) => {
    const row = customInputRows[rowIndex];
    if (!row || !row.name.trim()) return;
    const price = parseFloat(row.price) || 0;
    setCustomSaved((prev) => {
      const exists = prev.some((item) => item.name === row.name.trim());
      if (exists) return prev;
      return [...prev, { name: row.name.trim(), price }];
    });
    setCustomInputRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      if (next.length === 0) {
        return [{ id: `row-${Date.now()}`, name: "", price: "" }];
      }
      return next;
    });
  };

  const handleDeleteCustom = (idx: number) => {
    setCustomSaved((prev) => prev.filter((_, i) => i !== idx));
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

      const customPriceMap = new Map<string, number>();
      for (const item of customSaved) {
        customPriceMap.set(item.name, item.price);
      }

      const testIdMap = new Map<string, string>();

      for (const name of allSelectedTestNames) {
        if (existingMap.has(name)) {
          testIdMap.set(name, existingMap.get(name)!);
          continue;
        }
        const price = customPriceMap.get(name) ?? 0;
        let resolvedId: string | null = null;
        const { data: rpcId } = await supabase
          .rpc("ensure_lab_test", { test_name: name, test_price: price });
        if (rpcId) {
          resolvedId = rpcId as string;
        } else {
          const { data: inserted } = await supabase
            .from("lab_tests")
            .insert({ name, status: "active", price })
            .select("id")
            .maybeSingle();
          if (inserted) {
            resolvedId = inserted.id;
          } else {
            const { data: found } = await supabase
              .from("lab_tests")
              .select("id")
              .eq("name", name)
              .maybeSingle();
            if (found) resolvedId = found.id;
          }
        }
        if (resolvedId) testIdMap.set(name, resolvedId);
      }

      const validNames = allSelectedTestNames.filter((name) => testIdMap.has(name));
      if (validNames.length === 0) {
        throw new Error("No tests could be registered. Check that lab tests exist in the database.");
      }

      let batchConsultationId: string | null = null;
      if (validNames.length > 1) {
        const { data: consult } = await supabase
          .from("consultations")
          .insert({
            patient_id: patientId,
            chief_complaint: "Laboratory batch",
            doctor_id: referredBy || null,
          })
          .select("id")
          .maybeSingle();
        if (consult) batchConsultationId = consult.id;
      }

      const batchId = `BATCH-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();

      const validRequests = validNames.map((name) => ({
        patient_id: patientId,
        test_id: testIdMap.get(name),
        consultation_id: batchConsultationId,
        batch_id: batchId,
        status: "Requested" as const,
        payment_status: "Unpaid",
      }));

      const { data: createdRequests, error: reqError } = await supabase
        .from("lab_requests")
        .insert(validRequests)
        .select();
      if (reqError) throw reqError;
      const createdIds = createdRequests.map((r: any) => r.id);

      // Auto-create invoice for the lab requests (with retry on collision)
      const testIds = validNames.map((name) => testIdMap.get(name)).filter(Boolean);
      const { data: testPrices } = await supabase
        .from("lab_tests")
        .select("id, name, price")
        .in("id", testIds);

      const priceMap = new Map<string, { name: string; price: number }>();
      if (testPrices) {
        for (const t of testPrices) {
          priceMap.set(t.id, { name: t.name, price: t.price ?? 0 });
        }
      }

      let invoiceData: any = null;
      let invoiceError: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const invoiceNumber = await generateInvoiceNumber(supabase);
        const subtotal = createdRequests.reduce((sum: number, req: any) => {
          const info = priceMap.get(req.test_id);
          return sum + (info?.price ?? 0);
        }, 0);
        const totalAmount = computeTotalWithVat(subtotal, settings.vatPercentage, settings.vatEnabled);

        const { data: invData, error: invError } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            patient_id: patientId,
            total_amount: totalAmount,
            amount_paid: 0,
            balance: totalAmount,
            status: "Unpaid",
            source_type: "Lab & Radiology",
          })
          .select("id")
          .maybeSingle();

        if (invData) {
          invoiceData = invData;
          break;
        }

        invoiceError = invError;
        // If unique violation, retry with new number
        if ((invError as any)?.code === "23505") continue;

        break;
      }

      if (!invoiceData) {
        // Cleanup: remove orphaned lab requests
        await supabase.from("lab_requests").delete().in("id", createdIds);
        throw invoiceError || new Error("Failed to create invoice");
      }

      const invoiceId = invoiceData.id;

      const itemsPayload = createdRequests.map((req: any) => {
        const info = priceMap.get(req.test_id);
        return {
          invoice_id: invoiceId,
          description: info?.name ?? "Lab Test",
          quantity: 1,
          unit_price: info?.price ?? 0,
          total: info?.price ?? 0,
        };
      });

      const { error: itemsError } = await supabase.from("invoice_items").insert(itemsPayload);
      if (itemsError) throw itemsError;

      const { error: linkError } = await supabase
        .from("lab_requests")
        .update({ invoice_id: invoiceId })
        .in("id", createdIds);
      if (linkError) throw linkError;
    },
    onSuccess: () => {
      toast.success("Laboratory request created successfully");
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["lab-tests"] });
      queryClient.invalidateQueries({ queryKey: ["lab-tests-all"] });
      queryClient.invalidateQueries({ queryKey: ["labTests"] });
      onBack();
    },
    onError: (err) => {
      toast.error("Failed to save: " + err.message);
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
              category.tests.filter((t) => selectedTests.has(t)).length;

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

                </div>
              </div>
            );
          })}

          {customDbTests.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory("custom-tests")}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 md:cursor-default"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Custom Tests
                  </span>
                  {customDbTests.some((t: any) => selectedDbTests.has(t.id)) && (
                    <span className="text-[10px] font-bold text-[#005EB8] bg-[#005EB8]/10 px-1.5 py-0.5 rounded">
                      {customDbTests.filter((t: any) => selectedDbTests.has(t.id)).length}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform md:hidden ${
                    expandedCategories.has("custom-tests") ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div className={`${!expandedCategories.has("custom-tests") ? "hidden md:block" : "block"}`}>
                <div className="p-3 space-y-1.5">
                  {customDbTests.map((test: any) => (
                    <ToggleTile
                      key={test.id}
                      label={`${test.name}${test.price ? ` — ₦${Number(test.price).toFixed(2)}` : ""}`}
                      selected={selectedDbTests.has(test.id)}
                      onToggle={() => toggleDbTest(test.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
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

        {/* Custom Tests - Unified Input */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Custom Tests
            </span>
          </div>
          <div className="p-4">
            {customSaved.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {customSaved.map((item, idx) => (
                  <div
                    key={`saved-${item.name}-${idx}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005EB8]/10 text-[#005EB8] text-[12px] font-medium"
                  >
                    <span>{item.name}</span>
                    <span className="text-slate-300">—</span>
                    <span>₦{item.price.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(idx)}
                      className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {customInputRows.map((row, idx) => (
                <div key={row.id} className="flex gap-2 items-center">
                  <Input
                    value={row.name}
                    onChange={(e) =>
                      setCustomInputRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r))
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveCustom(idx);
                    }}
                    placeholder="Enter custom test name..."
                    className="h-9 text-xs border-dashed border-slate-300 flex-1"
                  />
                  <Input
                    type="number"
                    value={row.price}
                    onChange={(e) =>
                      setCustomInputRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, price: e.target.value } : r))
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveCustom(idx);
                    }}
                    placeholder="Price"
                    className="h-9 text-xs w-24 border-dashed border-slate-300"
                    step="0.01"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveCustom(idx)}
                    disabled={!row.name.trim()}
                    className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setCustomInputRows((prev) => [
                  ...prev,
                  { id: `row-${Date.now()}`, name: "", price: "" },
                ])
              }
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-[11px] text-slate-500 hover:border-[#005EB8] hover:text-[#005EB8] hover:bg-[#005EB8]/5 transition-all"
            >
              <Plus className="w-3 h-3" />
              Add new line
            </button>
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

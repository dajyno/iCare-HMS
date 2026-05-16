import { useState, useRef, useCallback, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  FolderOpen,
  Stethoscope,
  Bed,
  Plus,
  Loader2,
  Check,
  ChevronRight,
  User,
  Pill,
  FlaskConical,
  Beaker,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { usePatients, useDoctors, useCreateInvoice } from "./billingHooks";
import {
  INITIAL_FORM_STATE,
  DEFAULT_LINE_ITEM,
  computeSubtotal,
  computeLineItemAmount,
  generateItemCode,
  type LineItem,
  type NewInvoiceFormState,
  type InvoiceSourceType,
  type CatalogItem,
  MOCK_MEDICATIONS,
  MOCK_LAB_TESTS,
} from "./billingTypes";

interface NewInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

const LABEL_CLS = "text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1";

const NewInvoiceModal = ({ open, onClose }: NewInvoiceModalProps) => {
  const createInvoice = useCreateInvoice();

  const [form, setForm] = useState<NewInvoiceFormState>(INITIAL_FORM_STATE);
  const [patientQuery, setPatientQuery] = useState("");
  const [showPatientResults, setShowPatientResults] = useState(false);
  const [selectedTile, setSelectedTile] = useState<InvoiceSourceType | null>(null);
  const [accumulatedItems, setAccumulatedItems] = useState<LineItem[]>([]);
  const [addedFeedback, setAddedFeedback] = useState("");
  const searchTimeout = useRef<any>(null);

  const { data: patientResults, isLoading: searchingPatients } = usePatients(patientQuery);
  const { data: doctors } = useDoctors();

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM_STATE);
    setPatientQuery("");
    setShowPatientResults(false);
    setSelectedTile(null);
    setAccumulatedItems([]);
    setAddedFeedback("");
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handlePatientInput = (value: string) => {
    setPatientQuery(value);
    setForm((prev) => ({ ...prev, selectedPatient: null }));
    setShowPatientResults(true);
    clearTimeout(searchTimeout.current);
  };

  const selectPatient = (patient: { id: string; patientId: string; firstName: string; lastName: string }) => {
    setForm((prev) => ({
      ...prev,
      currentStep: 2,
      selectedPatient: patient,
    }));
    setShowPatientResults(false);
    setPatientQuery("");
  };

  const handleTileSelect = (type: InvoiceSourceType) => {
    setSelectedTile(type);
    setAddedFeedback("");

    if (type === "Admin") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        metaData: { ...prev.metaData, folderFee: 0 },
        lineItems: [
          {
            code: "ADM-01",
            name: "Medical Record Folder Creation Fee",
            type: "Service" as const,
            date: new Date().toISOString().split("T")[0],
            price: 0,
            qty: 1,
            amount: 0,
          },
        ],
      }));
    } else if (type === "Consultation") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        metaData: { ...prev.metaData, doctorId: "", doctorName: "", consultationFee: 0 },
        lineItems: [],
      }));
    } else if (type === "Inpatient") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        metaData: { ...prev.metaData, admissionDays: 1, dailyBedRate: 0 },
        lineItems: [],
      }));
    } else if (type === "Pharmacy") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        lineItems: [{ ...DEFAULT_LINE_ITEM, code: "PHM-01" }],
      }));
    } else if (type === "Lab & Radiology") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        lineItems: [{ ...DEFAULT_LINE_ITEM, code: "LAB-01" }],
      }));
    } else if (type === "General") {
      setForm((prev) => ({
        ...prev,
        sourceType: type,
        lineItems: [{ ...DEFAULT_LINE_ITEM }],
      }));
    }
  };

  const addConsultationLineItem = () => {
    if (!form.metaData.doctorId || !form.metaData.doctorName) return;
    const fee = form.metaData.consultationFee || 0;
    setForm((prev) => ({
      ...prev,
      lineItems: [
        {
          code: "CONS-01",
          name: `Consultation — Dr. ${prev.metaData.doctorName}`,
          type: "Service" as const,
          date: new Date().toISOString().split("T")[0],
          price: fee,
          qty: 1,
          amount: fee,
        },
      ],
    }));
  };

  const addInpatientLineItem = () => {
    const days = form.metaData.admissionDays || 1;
    const rate = form.metaData.dailyBedRate || 0;
    const total = days * rate;
    setForm((prev) => ({
      ...prev,
      lineItems: [
        {
          code: "INP-01",
          name: `Inpatient Admission (${days} day${days > 1 ? "s" : ""})`,
          type: "Service" as const,
          date: new Date().toISOString().split("T")[0],
          price: total,
          qty: 1,
          amount: total,
        },
      ],
    }));
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: any) => {
    setForm((prev) => {
      const items = prev.lineItems.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === "price" || field === "qty") {
          const price = field === "price" ? Number(value) : item.price;
          const qty = field === "qty" ? Number(value) : item.qty;
          updated.amount = computeLineItemAmount(price || 0, qty || 0);
        }
        return updated;
      });
      return { ...prev, lineItems: items };
    });
  };

  const addRow = () => {
    setForm((prev) => {
      const prefix = prev.sourceType === "Pharmacy" ? "PHM" : prev.sourceType === "Lab & Radiology" ? "LAB" : "G";
      return {
        ...prev,
        lineItems: [
          ...prev.lineItems,
          { ...DEFAULT_LINE_ITEM, code: `${prefix}-${String(prev.lineItems.length + 1).padStart(2, "0")}` },
        ],
      };
    });
  };

  const removeRow = (idx: number) => {
    if (form.lineItems.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx).map((item, i) => ({
        ...item,
        code: item.code,
      })),
    }));
  };

  const handleAddToInvoice = () => {
    const validItems = form.lineItems.filter((item) => item.name.trim() && item.price > 0);
    if (validItems.length === 0) return;
    setAccumulatedItems((prev) => [...prev, ...validItems]);
    setAddedFeedback(`Added ${validItems.length} item${validItems.length > 1 ? "s" : ""}`);
  };

  const removeAccumulatedItem = (idx: number) => {
    setAccumulatedItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = useMemo(() => computeSubtotal(accumulatedItems), [accumulatedItems]);

  const canGenerate = useMemo(() => {
    if (!form.selectedPatient) return false;
    if (accumulatedItems.length === 0) return false;
    return true;
  }, [form.selectedPatient, accumulatedItems]);

  const handleGenerate = () => {
    if (!canGenerate || !form.selectedPatient) return;

    const invNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const sourceTypes = [...new Set(accumulatedItems.map((i) => i.code.slice(0, 2)))];
    const sourceLabel =
      sourceTypes.length === 1
        ? (form.sourceType || "General")
        : "General";

    createInvoice.mutate(
      {
        patientId: form.selectedPatient.id,
        patientInfo: {
          firstName: form.selectedPatient.firstName,
          lastName: form.selectedPatient.lastName,
          patientId: form.selectedPatient.patientId,
        },
        sourceType: sourceLabel,
        lineItems: accumulatedItems,
        invoiceNumber: invNumber,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  if (!open) return null;

  const renderAccumulatedSummary = () => {
    if (accumulatedItems.length === 0) return null;
    return (
      <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
            Invoice Items ({accumulatedItems.length})
          </span>
          <span className="font-mono text-lg font-extrabold text-slate-900 tabular-nums">
            ₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <Separator className="bg-indigo-200/50" />
        <div className="max-h-32 overflow-y-auto space-y-1">
          {accumulatedItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs group">
              <span className="text-slate-600 truncate flex-1">
                {item.name}
                {item.qty > 1 && <span className="text-slate-400 ml-1">×{item.qty}</span>}
              </span>
              <span className="font-mono text-slate-800 ml-2">₦{item.amount.toFixed(2)}</span>
              <button
                onClick={() => removeAccumulatedItem(idx)}
                className="ml-2 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCatalogSearchRow = (
    rowIdx: number,
    catalog: CatalogItem[],
    medQuery: string,
    setMedQuery: (v: string) => void,
    showResults: boolean,
    setShowResults: (v: boolean) => void
  ) => {
    const item = form.lineItems[rowIdx];
    if (!item) return null;

    const matches = medQuery.trim().length >= 1
      ? catalog.filter((c) => c.name.toLowerCase().includes(medQuery.toLowerCase()))
      : [];

    return (
      <div className="relative">
        <Input
          value={medQuery}
          onChange={(e) => {
            setMedQuery(e.target.value);
            setShowResults(true);
            if (!e.target.value) {
              updateLineItem(rowIdx, "name", "");
              updateLineItem(rowIdx, "price", 0);
            }
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search & select..."
          className="h-8 text-xs bg-white"
        />
        {showResults && medQuery.trim().length >= 1 && matches.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 border border-slate-200 rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto">
            {matches.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full px-3 py-2 text-left text-xs hover:bg-sky-50 flex items-center justify-between transition-colors"
                onClick={() => {
                  setMedQuery(c.name);
                  setForm((prev) => {
                    const items = prev.lineItems.map((li, i) =>
                      i === rowIdx
                        ? { ...li, name: c.name, price: c.price, amount: computeLineItemAmount(c.price, li.qty) }
                        : li
                    );
                    return { ...prev, lineItems: items };
                  });
                  setShowResults(false);
                }}
              >
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="font-mono text-slate-500">₦{c.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderItemTable = (
    catalog: CatalogItem[],
    queries: string[],
    setQueries: (v: string[]) => void,
    showResultsList: boolean[],
    setShowResultsList: (v: boolean[]) => void
  ) => {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-14">Code</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Item / Search</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-28">Price (₦)</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-16">Qty</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-28">Amount (₦)</th>
                <th className="px-3 py-2.5 text-center w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {form.lineItems.map((item, idx) => (
                <tr key={`${item.code}-${idx}`} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2">
                    <span className="font-mono text-[11px] text-slate-400">{item.code}</span>
                  </td>
                  <td className="px-3 py-2 min-w-[200px]">
                    {renderCatalogSearchRow(idx, catalog, queries[idx] || "", (v) => {
                      const q = [...queries];
                      q[idx] = v;
                      setQueries(q);
                    }, showResultsList[idx] || false, (v) => {
                      const s = [...showResultsList];
                      s[idx] = v;
                      setShowResultsList(s);
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.price || ""}
                      onChange={(e) => updateLineItem(idx, "price", Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-8 text-xs text-right bg-transparent border-0 px-1 focus:bg-white focus:border font-mono"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => updateLineItem(idx, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8 text-xs text-right bg-transparent border-0 px-1 focus:bg-white focus:border font-mono"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    ₦{item.amount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {form.lineItems.length > 1 && (
                      <button
                        onClick={() => removeRow(idx)}
                        className="text-slate-300 hover:text-red-400 transition-colors p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
          onClick={addRow}
        >
          <Plus className="w-3 h-3" />
          Add Item Row
        </Button>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        layout
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full p-6 max-h-[90vh] overflow-y-auto max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New Invoice</h2>
            <p className="text-xs text-slate-400">Step {form.currentStep} of 2</p>
          </div>
          <div className="flex items-center gap-3">
            {accumulatedItems.length > 0 && (
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold gap-1">
                <ShoppingCart className="w-3 h-3" />
                {accumulatedItems.length} item{accumulatedItems.length > 1 ? "s" : ""} · ₦{subtotal.toFixed(2)}
              </Badge>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${form.currentStep >= 1 ? "bg-blue-600" : "bg-slate-200"}`} />
          <div className={`h-0.5 w-8 rounded ${form.currentStep >= 2 ? "bg-blue-600" : "bg-slate-200"}`} />
          <div className={`w-2 h-2 rounded-full ${form.currentStep >= 2 ? "bg-blue-600" : "bg-slate-200"}`} />
        </div>

        <AnimatePresence mode="wait">
          {form.currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                  Search Patient Profile
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={patientQuery}
                    onChange={(e) => handlePatientInput(e.target.value)}
                    placeholder="Search patient by name or folder ID..."
                    className="pl-9 h-10 text-sm"
                    onFocus={() => setShowPatientResults(true)}
                  />
                </div>

                {showPatientResults && patientQuery.trim().length >= 2 && (
                  <div className="mt-1.5 border border-slate-200 rounded-xl overflow-hidden bg-white/90 backdrop-blur-md shadow-lg">
                    {searchingPatients ? (
                      <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
                    ) : !patientResults || patientResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400">No patients match your search</div>
                    ) : (
                      patientResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full px-4 py-3 text-left text-sm hover:bg-sky-50 flex items-center justify-between transition-colors"
                          onClick={() => selectPatient(p)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div>
                              <span className="font-medium text-slate-900">{p.firstName} {p.lastName}</span>
                              <span className="block text-[11px] font-mono text-slate-400">{p.patientId}</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="ghost" size="sm" className="h-9 text-slate-500" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {form.currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Patient Card */}
              {form.selectedPatient && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {form.selectedPatient.firstName} {form.selectedPatient.lastName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">{form.selectedPatient.patientId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setForm((prev) => ({ ...prev, currentStep: 1, selectedPatient: null }));
                      setSelectedTile(null);
                      setAccumulatedItems([]);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Tile Grid — always visible */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {accumulatedItems.length > 0 ? "Add More Items" : "Select Invoice Source"}
                  </h3>
                  {selectedTile && (
                    <button
                      onClick={() => { setSelectedTile(null); setAddedFeedback(""); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Back to sources
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <MiniTile
                    icon={<FolderOpen className="w-4 h-4" />}
                    label="Admin"
                    color="amber"
                    active={selectedTile === "Admin"}
                    onClick={() => handleTileSelect("Admin")}
                    hasItems={accumulatedItems.some((i) => i.code.startsWith("ADM"))}
                  />
                  <MiniTile
                    icon={<Stethoscope className="w-4 h-4" />}
                    label="Consultation"
                    color="teal"
                    active={selectedTile === "Consultation"}
                    onClick={() => handleTileSelect("Consultation")}
                    hasItems={accumulatedItems.some((i) => i.code.startsWith("CONS"))}
                  />
                  <MiniTile
                    icon={<Bed className="w-4 h-4" />}
                    label="Inpatient"
                    color="rose"
                    active={selectedTile === "Inpatient"}
                    onClick={() => handleTileSelect("Inpatient")}
                    hasItems={accumulatedItems.some((i) => i.code.startsWith("INP"))}
                  />
                  <MiniTile
                    icon={<Pill className="w-4 h-4" />}
                    label="Pharmacy"
                    color="sky"
                    active={selectedTile === "Pharmacy"}
                    onClick={() => handleTileSelect("Pharmacy")}
                    hasItems={accumulatedItems.some((i) => i.code.startsWith("PHM"))}
                  />
                  <MiniTile
                    icon={<FlaskConical className="w-4 h-4" />}
                    label="Lab & Radiology"
                    color="purple"
                    active={selectedTile === "Lab & Radiology"}
                    onClick={() => handleTileSelect("Lab & Radiology")}
                    hasItems={accumulatedItems.some((i) => i.code.startsWith("LAB"))}
                  />
                  <MiniTile
                    icon={<Beaker className="w-4 h-4" />}
                    label="General"
                    color="indigo"
                    active={selectedTile === "General"}
                    onClick={() => handleTileSelect("General")}
                    hasItems={accumulatedItems.some((i) => !i.code.startsWith("ADM") && !i.code.startsWith("CONS") && !i.code.startsWith("INP") && !i.code.startsWith("PHM") && !i.code.startsWith("LAB"))}
                  />
                </div>
              </div>

              {/* Tile Content Area */}
              <AnimatePresence mode="wait">
                {selectedTile === "Admin" && (
                  <TileContent key="admin">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">Card/Folder Opening Fee</h3>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-medium text-slate-700">Medical Record Folder Creation Fee</p>
                      <div>
                        <Label className={LABEL_CLS}>Fee Amount (₦)</Label>
                        <Input
                          type="number" min={0} step={0.01}
                          value={form.metaData.folderFee || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setForm((prev) => ({
                              ...prev,
                              metaData: { ...prev.metaData, folderFee: val },
                              lineItems: [{
                                code: "ADM-01",
                                name: "Medical Record Folder Creation Fee",
                                type: "Service" as const,
                                date: new Date().toISOString().split("T")[0],
                                price: val, qty: 1, amount: val,
                              }],
                            }));
                          }}
                          placeholder="0.00"
                          className="h-9 w-48 bg-white"
                        />
                      </div>
                    </div>
                    {renderAddToInvoiceButton()}
                  </TileContent>
                )}

                {selectedTile === "Consultation" && (
                  <TileContent key="consultation">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">Consultation Details</h3>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-4 space-y-4">
                      <div>
                        <Label className={LABEL_CLS}>Select Doctor</Label>
                        <select
                          value={form.metaData.doctorId}
                          onChange={(e) => {
                            const doctor = doctors?.find((d) => d.id === e.target.value);
                            setForm((prev) => ({
                              ...prev,
                              metaData: { ...prev.metaData, doctorId: e.target.value, doctorName: doctor?.fullName || "" },
                            }));
                          }}
                          className="h-9 text-sm rounded-lg border border-slate-200 bg-white px-3 w-full"
                        >
                          <option value="">Select a doctor...</option>
                          {doctors?.map((doc) => (
                            <option key={doc.id} value={doc.id}>Dr. {doc.fullName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className={LABEL_CLS}>Consultation Fee (₦)</Label>
                        <Input
                          type="number" min={0} step={0.01}
                          value={form.metaData.consultationFee || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setForm((prev) => ({
                              ...prev,
                              metaData: { ...prev.metaData, consultationFee: val },
                            }));
                          }}
                          placeholder="0.00"
                          className="h-9 w-48 bg-white"
                        />
                      </div>
                      <Button size="sm" className="h-8 text-xs gap-1.5" onClick={addConsultationLineItem}>
                        <Check className="w-3 h-3" />
                        Preview Item
                      </Button>
                      {form.lineItems.length > 0 && form.lineItems[0].price > 0 && (
                        <div className="bg-white rounded-lg p-3 text-sm">
                          <span className="text-slate-500">Consultation fee: </span>
                          <span className="font-semibold text-slate-900">₦{form.lineItems[0].price.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    {renderAddToInvoiceButton()}
                  </TileContent>
                )}

                {selectedTile === "Inpatient" && (
                  <TileContent key="inpatient">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">Inpatient Admission</h3>
                    </div>
                    <div className="bg-rose-50 rounded-xl p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className={LABEL_CLS}>Admission Days</Label>
                          <Input
                            type="number" min={1}
                            value={form.metaData.admissionDays}
                            onChange={(e) => setForm((prev) => ({
                              ...prev,
                              metaData: { ...prev.metaData, admissionDays: Math.max(1, parseInt(e.target.value) || 1) },
                            }))}
                            className="h-9 bg-white"
                          />
                        </div>
                        <div>
                          <Label className={LABEL_CLS}>Daily Bed Rate (₦)</Label>
                          <Input
                            type="number" min={0} step={0.01}
                            value={form.metaData.dailyBedRate || ""}
                            onChange={(e) => setForm((prev) => ({
                              ...prev,
                              metaData: { ...prev.metaData, dailyBedRate: Number(e.target.value) || 0 },
                            }))}
                            placeholder="0.00"
                            className="h-9 bg-white"
                          />
                        </div>
                      </div>
                      <Button size="sm" className="h-8 text-xs gap-1.5" onClick={addInpatientLineItem} disabled={!form.metaData.dailyBedRate}>
                        <Check className="w-3 h-3" />
                        Preview Item
                      </Button>
                      {form.lineItems.length > 0 && (
                        <div className="bg-white rounded-lg p-3 space-y-1">
                          <p className="text-sm text-slate-500">
                            {form.metaData.admissionDays} day(s) × ₦{form.metaData.dailyBedRate.toFixed(2)}
                          </p>
                          <p className="text-base font-bold text-slate-900">
                            Total: ₦{(form.metaData.admissionDays * form.metaData.dailyBedRate).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                    {renderAddToInvoiceButton()}
                  </TileContent>
                )}

                {selectedTile === "Pharmacy" && (
                  <motion.div key="pharmacy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <PharmacyLabContent catalog={MOCK_MEDICATIONS} />
                  </motion.div>
                )}
                {selectedTile === "Lab & Radiology" && (
                  <motion.div key="lab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <PharmacyLabContent catalog={MOCK_LAB_TESTS} />
                  </motion.div>
                )}
                {selectedTile === "General" && (
                  <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <GeneralContent />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Added feedback */}
              {addedFeedback && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 text-center font-medium"
                >
                  <Check className="w-3 h-3 inline mr-1" />{addedFeedback}
                </motion.p>
              )}

              {/* Accumulated Items Summary */}
              {renderAccumulatedSummary()}

              {/* Footer */}
              <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white/80 backdrop-blur-md border-t border-slate-200 rounded-b-2xl flex items-center justify-between">
                <Button variant="ghost" size="sm" className="h-9 text-slate-500" onClick={handleClose}>
                  Cancel
                </Button>

                {createInvoice.error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 mx-2 flex-1 text-center">
                    {(createInvoice.error as any)?.message || "Failed to create invoice"}
                  </p>
                )}

                <Button
                  size="sm"
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
                  onClick={handleGenerate}
                  disabled={!canGenerate || createInvoice.isPending}
                >
                  {createInvoice.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {createInvoice.isPending ? "Generating..." : "Generate Bill"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );

  function renderAddToInvoiceButton() {
    const hasItems = form.lineItems.some((i) => i.name.trim() && i.price > 0);
    return (
      <Button
        size="sm"
        className="h-8 text-xs gap-1.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        onClick={handleAddToInvoice}
        disabled={!hasItems}
      >
        <ShoppingCart className="w-3 h-3" />
        Add to Invoice
      </Button>
    );
  }

  function TileContent({ children, key }: { children: ReactNode; key: string }) {
    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {children}
      </motion.div>
    );
  }

  function PharmacyLabContent({ catalog }: { catalog: CatalogItem[] }) {
    const [searchQueries, setSearchQueries] = useState<string[]>(form.lineItems.map(() => ""));
    const [showResultsList, setShowResultsList] = useState<boolean[]>(form.lineItems.map(() => false));

    return (
      <TileContent key="catalog">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            {catalog === MOCK_MEDICATIONS ? "Pharmacy Items" : "Lab & Radiology Items"}
          </h3>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          {renderItemTable(catalog, searchQueries, setSearchQueries, showResultsList, setShowResultsList)}
        </div>
        {renderAddToInvoiceButton()}
      </TileContent>
    );
  }

  function GeneralContent() {
    return (
      <TileContent key="general">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">General Billings Ledger</h3>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-14">Code</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider">Item Name</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-24">Type</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider w-28">Date</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-28">Price (₦)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-16">Qty</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider w-28">Amount (₦)</th>
                  <th className="px-3 py-2.5 text-center w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence>
                  {form.lineItems.map((item, idx) => (
                    <motion.tr
                      key={`${item.code}-${idx}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="px-3 py-2">
                        <span className="font-mono text-[11px] text-slate-400">{item.code}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={item.name}
                          onChange={(e) => updateLineItem(idx, "name", e.target.value)}
                          placeholder="Item name"
                          className="h-8 text-xs border-0 bg-transparent px-1 focus:bg-white focus:border"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.type}
                          onChange={(e) => updateLineItem(idx, "type", e.target.value)}
                          className="h-8 text-xs rounded-lg border border-slate-200 bg-white px-2 w-full"
                        >
                          <option value="Service">Service</option>
                          <option value="Product">Product</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateLineItem(idx, "date", e.target.value)}
                          className="h-8 text-xs border-0 bg-transparent px-1 focus:bg-white focus:border"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min={0} step={0.01}
                          value={item.price || ""}
                          onChange={(e) => updateLineItem(idx, "price", Number(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-8 text-xs text-right border-0 bg-transparent px-1 focus:bg-white focus:border font-mono w-full min-w-[80px]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number" min={1}
                          value={item.qty}
                          onChange={(e) => updateLineItem(idx, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-8 text-xs text-right border-0 bg-transparent px-1 focus:bg-white focus:border font-mono w-full min-w-[50px]"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap min-w-[90px]">
                        ₦{item.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {form.lineItems.length > 1 && (
                          <button
                            onClick={() => removeRow(idx)}
                            className="text-slate-300 hover:text-red-400 transition-colors p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
            onClick={addRow}
          >
            <Plus className="w-3 h-3" />
            Add Item Row
          </Button>

          {renderAddToInvoiceButton()}
        </div>
      </TileContent>
    );
  }
};

interface MiniTileProps {
  icon: ReactNode;
  label: string;
  color: "amber" | "teal" | "rose" | "indigo" | "sky" | "purple";
  active: boolean;
  onClick: () => void;
  hasItems: boolean;
}

const miniColorMap: Record<string, { bg: string; border: string; icon: string }> = {
  amber: { bg: "bg-amber-50 hover:bg-amber-100", border: "border-amber-200", icon: "text-amber-600" },
  teal: { bg: "bg-teal-50 hover:bg-teal-100", border: "border-teal-200", icon: "text-teal-600" },
  rose: { bg: "bg-rose-50 hover:bg-rose-100", border: "border-rose-200", icon: "text-rose-600" },
  indigo: { bg: "bg-indigo-50 hover:bg-indigo-100", border: "border-indigo-200", icon: "text-indigo-600" },
  sky: { bg: "bg-sky-50 hover:bg-sky-100", border: "border-sky-200", icon: "text-sky-600" },
  purple: { bg: "bg-purple-50 hover:bg-purple-100", border: "border-purple-200", icon: "text-purple-600" },
};

const MiniTile = ({ icon, label, color, active, onClick, hasItems }: MiniTileProps) => {
  const c = miniColorMap[color] || miniColorMap.indigo;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center transition-all ${
        active ? `${c.bg} ${c.border} ring-2 ring-offset-1 ring-slate-300` : `${c.bg} border-transparent`
      }`}
    >
      <div className={`${c.icon} relative`}>
        {icon}
        {hasItems && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
        )}
      </div>
      <span className={`text-[10px] font-bold leading-tight ${active ? "text-slate-800" : "text-slate-600"}`}>
        {label}
      </span>
    </button>
  );
};

export default NewInvoiceModal;

import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Settings2 } from "lucide-react";
import SearchableSelect from "@/components/ui/searchable-select";
import { useCreateIncome, usePatients, useIncomeCategories } from "../hooks";
import ManageCategoriesModal from "../ManageCategoriesModal";

interface Props {
  open: boolean;
  onClose: () => void;
  banks: { bank_id: string; bank_name: string; account_name: string }[];
}

const NewIncomeModal = ({ open, onClose, banks }: Props) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [bankId, setBankId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [patientQuery, setPatientQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; patientId: string; name: string } | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const patientRef = useRef<HTMLDivElement>(null);
  const { data: patients } = usePatients(patientQuery);
  const { data: incomeCats } = useIncomeCategories();
  const createIncome = useCreateIncome();

  useEffect(() => {
    if (!open) {
      setAmount("");
      setCategory("");
      setBankId("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setPaymentMethod("Cash");
      setPatientQuery("");
      setSelectedPatient(null);
      setShowPatientDropdown(false);
    }
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isCash = paymentMethod === "Cash";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;
    if (!isCash && !bankId) return;
    const selectedBank = banks.find((b) => b.bank_id === bankId);
    await createIncome.mutateAsync({
      amount: parseFloat(amount),
      category,
      bank_id: isCash ? "CASH" : bankId,
      bank_name: isCash ? "Cash on Hand" : (selectedBank?.bank_name || ""),
      status: "Pending",
      date,
      description,
      patient_id: selectedPatient?.patientId,
      patient_name: selectedPatient?.name,
      payment_method: paymentMethod,
    });
    onClose();
  };

  const handleSelectPatient = (p: { id: string; patientId: string; firstName: string; lastName: string }) => {
    setSelectedPatient({ id: p.id, patientId: p.patientId, name: `${p.firstName} ${p.lastName}` });
    setPatientQuery(`${p.firstName} ${p.lastName}`);
    setShowPatientDropdown(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Income Entry</DialogTitle>
            <DialogDescription>Record a new income transaction. It will be saved as Pending until verified.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inc-amount">Amount (₦)</Label>
                <Input id="inc-amount" type="number" step="0.01" min="0" placeholder="25000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inc-category">Category</Label>
                  <button type="button" onClick={() => setShowCategories(true)} className="text-slate-400 hover:text-slate-600 transition-colors" title="Manage categories">
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  id="inc-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="" disabled>Select</option>
                  {(incomeCats || []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inc-method">Payment Method</Label>
                <select
                  id="inc-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Transfer">Bank Transfer</option>
                  <option value="Insurance Split">Insurance Split</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-date">Date</Label>
                <Input id="inc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="inc-bank">Bank Account</Label>
                <SearchableSelect
                  value={isCash ? "" : bankId}
                  onValueChange={(v) => setBankId(v)}
                  options={banks.map((b) => ({ value: b.bank_id, label: b.bank_name }))}
                  placeholder={isCash ? "N/A — Cash transaction" : "Select bank"}
                  disabled={isCash}
                />
                {isCash && <p className="text-[10px] text-slate-400 mt-0.5">Bank not required for cash payments</p>}
              </div>
              <div className="space-y-1.5" ref={patientRef}>
                <Label htmlFor="inc-patient">Patient</Label>
                <Input
                  id="inc-patient"
                  placeholder="Search patient..."
                  value={patientQuery}
                  onChange={(e) => { setPatientQuery(e.target.value); setSelectedPatient(null); setShowPatientDropdown(true); }}
                  onFocus={() => setShowPatientDropdown(true)}
                  autoComplete="off"
                />
                {showPatientDropdown && patientQuery.trim().length >= 2 && (
                  <div className="absolute z-50 mt-1 w-[calc(50%-0.5rem)] bg-white rounded-lg border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                    {(!patients || patients.length === 0) ? (
                      <div className="p-3 text-xs text-slate-400 text-center">No patients found</div>
                    ) : (
                      patients.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between"
                          onClick={() => handleSelectPatient(p)}
                        >
                          <span className="font-medium text-slate-900">{p.firstName} {p.lastName}</span>
                          <span className="text-slate-400 font-mono">{p.patientId}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-desc">Description</Label>
              <Input id="inc-desc" placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" disabled={createIncome.isPending}>
                {createIncome.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {createIncome.isPending ? "Saving..." : "Save as Pending"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ManageCategoriesModal open={showCategories} onClose={() => setShowCategories(false)} />
    </>
  );
};

export default NewIncomeModal;

import { useState, type FormEvent } from "react";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useCreateIncome } from "../hooks";
import { INCOME_CATEGORIES } from "../types";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  banks: { bank_id: string; bank_name: string }[];
}

const NewIncomeModal = ({ open, onClose, banks }: Props) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [bankId, setBankId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [patientId, setPatientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const createIncome = useCreateIncome();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !bankId || !date) return;
    const selectedBank = banks.find((b) => b.bank_id === bankId);
    await createIncome.mutateAsync({
      amount: parseFloat(amount),
      category,
      bank_id: bankId,
      bank_name: selectedBank?.bank_name || "",
      status: "Pending",
      date,
      description,
      patient_id: patientId || undefined,
      payment_method: paymentMethod,
    });
    setAmount("");
    setCategory("");
    setBankId("");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setPatientId("");
    setPaymentMethod("Cash");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Income Entry</DialogTitle>
          <DialogDescription>Record a new income transaction. It will be saved as Pending until verified.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inc-amount">Amount (₦)</Label>
              <Input id="inc-amount" type="number" step="0.01" min="0" placeholder="25000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="inc-category"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inc-bank">Bank Account</Label>
              <Select value={bankId} onValueChange={setBankId} required>
                <SelectTrigger id="inc-bank"><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => <SelectItem key={b.bank_id} value={b.bank_id}>{b.bank_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-date">Date</Label>
              <Input id="inc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="inc-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="inc-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Insurance Split">Insurance Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-patient">Patient ID (optional)</Label>
              <Input id="inc-patient" placeholder="PT-001" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
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
  );
};

export default NewIncomeModal;

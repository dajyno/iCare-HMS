import { useState, useEffect, type FormEvent } from "react";
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
import { useCreateExpense, useExpenseCategories } from "../hooks";
import ManageCategoriesModal from "../ManageCategoriesModal";

interface Props {
  open: boolean;
  onClose: () => void;
  banks: { bank_id: string; bank_name: string; account_name: string }[];
}

const NewExpenseModal = ({ open, onClose, banks }: Props) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [bankId, setBankId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [showCategories, setShowCategories] = useState(false);
  const { data: expenseCats } = useExpenseCategories();
  const createExpense = useCreateExpense();

  useEffect(() => {
    if (!open) {
      setAmount("");
      setCategory("");
      setBankId("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setPayee("");
      setPaymentMethod("Cash");
    }
  }, [open]);

  const isCash = paymentMethod === "Cash";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;
    if (!isCash && !bankId) return;
    const selectedBank = banks.find((b) => b.bank_id === bankId);
    await createExpense.mutateAsync({
      amount: parseFloat(amount),
      category,
      bank_id: isCash ? "CASH" : bankId,
      bank_name: isCash ? "Cash on Hand" : (selectedBank?.bank_name || ""),
      status: "Pending",
      date,
      description,
      payee,
      payment_method: paymentMethod,
    });
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Expense Entry</DialogTitle>
            <DialogDescription>Record a new expense. It will be saved as Pending until verified.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount">Amount (₦)</Label>
                <Input id="exp-amount" type="number" step="0.01" min="0" placeholder="10000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="exp-category">Category</Label>
                  <button type="button" onClick={() => setShowCategories(true)} className="text-slate-400 hover:text-slate-600 transition-colors" title="Manage categories">
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  id="exp-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="" disabled>Select</option>
                  {(expenseCats || []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-method">Payment Method</Label>
                <select
                  id="exp-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">Date</Label>
                <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-bank">Bank Account</Label>
                <SearchableSelect
                  value={isCash ? "" : bankId}
                  onValueChange={(v) => setBankId(v)}
                  options={banks.map((b) => ({ value: b.bank_id, label: b.bank_name }))}
                  placeholder={isCash ? "N/A — Cash transaction" : "Select bank"}
                  disabled={isCash}
                />
                {isCash && <p className="text-[10px] text-slate-400 mt-0.5">Bank not required for cash payments</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-payee">Payee</Label>
                <Input id="exp-payee" placeholder="Vendor name" value={payee} onChange={(e) => setPayee(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-desc">Description</Label>
              <Input id="exp-desc" placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5" disabled={createExpense.isPending}>
                {createExpense.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {createExpense.isPending ? "Saving..." : "Save as Pending"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ManageCategoriesModal open={showCategories} onClose={() => setShowCategories(false)} />
    </>
  );
};

export default NewExpenseModal;

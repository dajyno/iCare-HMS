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
import { useCreateExpense } from "../hooks";
import { EXPENSE_CATEGORIES } from "../types";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  banks: { bank_id: string; bank_name: string }[];
}

const NewExpenseModal = ({ open, onClose, banks }: Props) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [bankId, setBankId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const createExpense = useCreateExpense();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !bankId || !date) return;
    const selectedBank = banks.find((b) => b.bank_id === bankId);
    await createExpense.mutateAsync({
      amount: parseFloat(amount),
      category,
      bank_id: bankId,
      bank_name: selectedBank?.bank_name || "",
      status: "Pending",
      date,
      description,
      payee,
      payment_method: paymentMethod,
    });
    setAmount("");
    setCategory("");
    setBankId("");
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setPayee("");
    setPaymentMethod("Cash");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Expense Entry</DialogTitle>
          <DialogDescription>Record a new expense. It will be saved as Pending until verified.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount (₦)</Label>
              <Input id="exp-amount" type="number" step="0.01" min="0" placeholder="10000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="exp-category"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-bank">Bank Account</Label>
              <Select value={bankId} onValueChange={setBankId} required>
                <SelectTrigger id="exp-bank"><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  {banks.map((b) => <SelectItem key={b.bank_id} value={b.bank_id}>{b.bank_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="exp-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
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
  );
};

export default NewExpenseModal;

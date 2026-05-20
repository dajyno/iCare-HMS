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
import { Badge } from "@/components/ui/badge";
import { STATUS_STYLES } from "./types";
import { Check, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    _type: "Income" | "Expense";
    amount: number;
    category: string;
    description: string;
    date: string;
    bank_name?: string;
    payment_method: string;
  } | null;
  onConfirm: () => void;
  isPending: boolean;
}

const VerificationModal = ({ open, onClose, transaction, onConfirm, isPending }: Props) => {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Verify {transaction._type}</span>
            <Badge variant="outline" className={STATUS_STYLES.Pending}>Pending</Badge>
          </DialogTitle>
          <DialogDescription>
            Confirm this transaction to update the bank balance and unlock the clinical lock.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-bold text-slate-900 tabular-nums">₦{transaction.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Category</span>
              <span className="font-medium">{transaction.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Description</span>
              <span className="font-medium">{transaction.description || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span>{transaction.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bank</span>
              <span>{transaction.bank_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method</span>
              <span>{transaction.payment_method}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Confirming will change status to <strong>Verified</strong>, update the bank balance, and release the patient lock if applicable.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {isPending ? "Verifying..." : "Confirm & Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationModal;

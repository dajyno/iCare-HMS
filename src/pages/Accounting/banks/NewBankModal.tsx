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
import { useCreateBankAccount } from "../hooks";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NewBankModal = ({ open, onClose }: Props) => {
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [balance, setBalance] = useState("");
  const createBank = useCreateBankAccount();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountName || !accountNumber) return;
    try {
      await createBank.mutateAsync({
        bank_name: bankName,
        account_name: accountName,
        account_number: accountNumber,
        balance: parseFloat(balance) || 0,
      });
      setBankName("");
      setAccountName("");
      setAccountNumber("");
      setBalance("");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add bank account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Bank Account</DialogTitle>
          <DialogDescription>Add a new bank account to the registry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bnk-name">Bank Name</Label>
            <Input id="bnk-name" placeholder="GTBank" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bnk-acct-name">Account Name</Label>
            <Input id="bnk-acct-name" placeholder="Operations" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bnk-acct-no">Account Number</Label>
              <Input id="bnk-acct-no" placeholder="0123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bnk-balance">Opening Balance (₦)</Label>
              <Input id="bnk-balance" type="number" step="0.01" placeholder="0" value={balance} onChange={(e) => setBalance(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button type="submit" size="sm" className="gap-1.5" disabled={createBank.isPending}>
              {createBank.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {createBank.isPending ? "Adding..." : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewBankModal;

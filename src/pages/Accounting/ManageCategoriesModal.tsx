import { useState, useEffect } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, X, Pencil, Check, Loader2 } from "lucide-react";
import {
  getIncomeCategories,
  getExpenseCategories,
  addIncomeCategory,
  addExpenseCategory,
  removeIncomeCategory,
  removeExpenseCategory,
  renameIncomeCategory,
  renameExpenseCategory,
} from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ManageCategoriesModal = ({ open, onClose }: Props) => {
  const [tab, setTab] = useState("income");
  const [incomeCats, setIncomeCats] = useState(getIncomeCategories());
  const [expenseCats, setExpenseCats] = useState(getExpenseCategories());
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (open) {
      setIncomeCats(getIncomeCategories());
      setExpenseCats(getExpenseCategories());
      setNewName("");
      setEditing(null);
    }
  }, [open]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    if (tab === "income") {
      addIncomeCategory(newName.trim());
      setIncomeCats(getIncomeCategories());
    } else {
      addExpenseCategory(newName.trim());
      setExpenseCats(getExpenseCategories());
    }
    setNewName("");
  };

  const handleRemove = (name: string) => {
    if (tab === "income") {
      removeIncomeCategory(name);
      setIncomeCats(getIncomeCategories());
    } else {
      removeExpenseCategory(name);
      setExpenseCats(getExpenseCategories());
    }
  };

  const handleRename = (oldName: string) => {
    if (!editValue.trim()) return;
    if (tab === "income") {
      renameIncomeCategory(oldName, editValue.trim());
      setIncomeCats(getIncomeCategories());
    } else {
      renameExpenseCategory(oldName, editValue.trim());
      setExpenseCats(getExpenseCategories());
    }
    setEditing(null);
    setEditValue("");
  };

  const cats = tab === "income" ? incomeCats : expenseCats;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>Add, rename, or remove income and expense categories.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="py-2">
          <TabsList className="w-full">
            <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1">Expenses</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="New category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
                className="h-8 text-xs"
              />
              <Button size="xs" className="h-8 gap-1 shrink-0" onClick={handleAdd}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <div className="max-h-[260px] overflow-y-auto space-y-1 border rounded-lg p-1">
              {cats.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No categories yet.</p>
              ) : (
                cats.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 group">
                    {editing === cat.name ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRename(cat.name); } if (e.key === "Escape") setEditing(null); }}
                          className="h-7 text-xs flex-1"
                          autoFocus
                        />
                        <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleRename(cat.name)}>
                          <Check className="w-3 h-3 text-emerald-600" />
                        </Button>
                        <Button size="xs" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(null)}>
                          <X className="w-3 h-3 text-slate-400" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm flex-1">{cat.name}</span>
                        <button
                          onClick={() => { setEditing(cat.name); setEditValue(cat.name); }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-0.5"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemove(cat.name)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesModal;

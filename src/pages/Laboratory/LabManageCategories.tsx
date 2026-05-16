import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
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
import SearchableSelect from "@/components/ui/searchable-select";
import { Plus, Pencil, Save, X, Beaker, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const LabManageCategories = ({ open, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addPrice, setAddPrice] = useState("");

  const { data: tests } = useQuery({
    queryKey: ["lab-tests-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_tests")
        .select("*")
        .order("name");
      if (error) throw error;
      return toCamel(data);
    },
    enabled: open,
  });

  const allCategories = Array.from(
    new Set((Array.isArray(tests) ? tests : []).map((t: any) => t.category).filter(Boolean))
  ).sort();

  const groupedTests = (Array.isArray(tests) ? tests : []).reduce(
    (acc: Record<string, any[]>, t: any) => {
      const cat = t.category ?? "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    },
    {}
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, category, price }: { id: string; name: string; category: string; price: number }) => {
      const { error } = await supabase
        .from("lab_tests")
        .update({ name, category: category || null, price })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-tests-all"] });
      queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
      queryClient.invalidateQueries({ queryKey: ["lab-tests"] });
      setEditingId(null);
    },
    onError: (err: Error) => {
      console.error("Update lab test failed:", err);
      setErrorMsg("Update failed: " + err.message);
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, category, price }: { name: string; category: string; price: number }) => {
      const { error } = await supabase
        .from("lab_tests")
        .insert({ name, category: category || null, price, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-tests-all"] });
      queryClient.invalidateQueries({ queryKey: ["lab-tests"] });
      setShowAdd(false);
      setAddName("");
      setAddCategory("");
      setAddPrice("");
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      console.error("Add lab test failed:", err);
      setErrorMsg("Add failed: " + err.message);
    },
  });

  const startEditing = (test: any) => {
    setEditingId(test.id);
    setEditName(test.name);
    setEditCategory(test.category ?? "");
    setEditPrice(String(test.price ?? ""));
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateMutation.mutate({
      id,
      name: editName.trim(),
      category: editCategory.trim(),
      price: parseFloat(editPrice || "0"),
    });
  };

  const handleAdd = () => {
    if (!addName.trim()) return;
    addMutation.mutate({
      name: addName.trim(),
      category: addCategory.trim(),
      price: parseFloat(addPrice || "0"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setErrorMsg(null); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="w-4 h-4" />
            Manage Lab Tests
          </DialogTitle>
          <DialogDescription>
            View, edit, or add laboratory test types, categories, and pricing.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 mx-6">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 px-6 py-2">
          {Object.entries(groupedTests).map(([catName, catTests]) => (
            <div key={catName}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {catName}
              </h3>
              <div className="space-y-1">
                {catTests.map((test: any) => (
                  <div
                    key={test.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    {editingId === test.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <Input
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          placeholder="Category"
                          className="h-8 text-xs w-32"
                        />
                        <Input
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          type="number"
                          step="0.01"
                          className="h-8 text-xs w-24"
                        />
                        <button
                          onClick={() => handleUpdate(test.id)}
                          disabled={updateMutation.isPending}
                          className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-slate-800">{test.name}</span>
                        <span className="text-xs text-slate-400 w-32 text-right">{test.category ?? "—"}</span>
                        <span className="text-xs font-mono text-slate-500 w-24 text-right">
                          ₦{Number(test.price ?? 0).toFixed(2)}
                        </span>
                        <button
                          onClick={() => startEditing(test)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#005EB8] hover:bg-[#005EB8]/5"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedTests).length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No lab tests found.</p>
          )}
        </div>

        {/* Add Exam Inline Form */}
        {showAdd && (
          <div className="border-t border-slate-200 px-6 pt-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#005EB8]" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add New Test</span>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name</Label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Malaria Test"
                  className="h-9 text-sm"
                />
              </div>
              <div className="w-32">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</Label>
                <SearchableSelect
                  value={addCategory}
                  onValueChange={setAddCategory}
                  placeholder="Select..."
                  options={allCategories.map((c) => ({ value: c, label: c }))}
                />
              </div>
              <div className="w-24">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Price (₦)</Label>
                <Input
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-1.5 pb-0.5">
                <Button
                  size="sm"
                  className="bg-[#005EB8] hover:bg-[#004d9a] text-white h-9 px-4 text-xs font-semibold"
                  disabled={!addName.trim() || addMutation.isPending}
                  onClick={handleAdd}
                >
                  {addMutation.isPending ? "Adding..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-3 text-xs text-slate-500"
                  onClick={() => {
                    setShowAdd(false);
                    setAddName("");
                    setAddCategory("");
                    setAddPrice("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-200 px-6 py-4">
          {!showAdd && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 gap-1.5 text-xs font-semibold"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Test
            </Button>
          )}
          <div className="flex-1" />
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabManageCategories;

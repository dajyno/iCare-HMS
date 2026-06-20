import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
import { Plus, Pencil, Save, X, Scan } from "lucide-react";
import { toast } from "sonner";

interface ManageCategoriesDialogProps {
  open: boolean;
  onClose: () => void;
}

const ManageCategoriesDialog = ({ open, onClose }: ManageCategoriesDialogProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [showAddCustomCategory, setShowAddCustomCategory] = useState(false);
  const [addCustomCategory, setAddCustomCategory] = useState("");
  const [showEditCustomCategory, setShowEditCustomCategory] = useState(false);
  const [editCustomCategory, setEditCustomCategory] = useState("");

  const upsertRadiologyExamCaches = (exam: any) => {
    const radiologyExam = toCamel(exam);
    const keys = [["radiology-exams-all"], ["radiologyExams"], ["radiology-categories-with-exams"]] as const;
    for (const key of keys) {
      queryClient.setQueryData(key, (old: any) => {
        if (!Array.isArray(old)) return old;
        const idx = old.findIndex((t: any) => t.id === radiologyExam.id);
        if (idx >= 0) {
          const next = [...old];
          next[idx] = { ...next[idx], ...radiologyExam };
          return next;
        }
        return [...old, radiologyExam];
      });
    }
  };

  const { data: exams } = useQuery({
    queryKey: ["radiology-exams-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiology_exams")
        .select("*, category:radiology_categories(name)")
        .order("name");
      if (error) throw error;
      return toCamel(data);
    },
    enabled: open,
  });

  const { data: categories } = useQuery({
    queryKey: ["radiology-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radiology_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return toCamel(data);
    },
    enabled: open,
  });

  const groupedExams = (Array.isArray(exams) ? exams : []).reduce(
    (acc: Record<string, any[]>, exam: any) => {
      const catName = exam.category?.name ?? "Other";
      if (!acc[catName]) acc[catName] = [];
      acc[catName].push(exam);
      return acc;
    },
    {}
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, price, categoryId }: { id: string; name: string; price: number; categoryId: string }) => {
      const { error } = await supabase
        .from("radiology_exams")
        .update({ name, price, category_id: categoryId })
        .select("*")
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success("Radiology exam updated successfully");
      queryClient.invalidateQueries({ queryKey: ["radiology-exams-all"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
      queryClient.invalidateQueries({ queryKey: ["radiologyExams"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-categories-with-exams"] });
      upsertRadiologyExamCaches({ id: variables.id, name: variables.name, price: variables.price, category_id: variables.categoryId });
      setEditingId(null);
      setShowEditCustomCategory(false);
      setEditCustomCategory("");
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      console.error("Update exam failed:", err);
      setErrorMsg("Update failed: " + err.message);
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, price, categoryId }: { name: string; price: number; categoryId: string }) => {
      const { data, error } = await supabase
        .from("radiology_exams")
        .insert({ name, price, category_id: categoryId, status: "active" })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (created: any) => {
      toast.success("Radiology exam added successfully");
      if (created) upsertRadiologyExamCaches(created);
      queryClient.invalidateQueries({ queryKey: ["radiology-exams-all"] });
      queryClient.invalidateQueries({ queryKey: ["radiologyExams"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-categories-with-exams"] });
      setShowAdd(false);
      setAddName("");
      setAddPrice("");
      setAddCategory("");
      setShowAddCustomCategory(false);
      setAddCustomCategory("");
      setErrorMsg(null);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
      toast.error(`Failed to add radiology exam: ${err.message}`);
    },
  });

  const startEditing = (exam: any) => {
    setEditingId(exam.id);
    setEditName(exam.name);
    setEditPrice(String(exam.price ?? ""));
    setEditCategory(exam.categoryId ?? "");
    setShowEditCustomCategory(false);
    setEditCustomCategory("");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || !editPrice) return;
    let categoryId = editCategory;
    if (showEditCustomCategory) {
      if (!editCustomCategory.trim()) return;
      const { data: newCat, error: catError } = await supabase
        .from("radiology_categories")
        .insert({ name: editCustomCategory.trim() })
        .select()
        .single();
      if (catError) { setErrorMsg(catError.message); return; }
      categoryId = newCat.id;
      queryClient.invalidateQueries({ queryKey: ["radiology-categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-categories-with-exams"] });
    }
    if (!categoryId) return;
    updateMutation.mutate({
      id,
      name: editName.trim(),
      price: parseFloat(editPrice),
      categoryId,
    });
  };

  const handleAdd = async () => {
    if (!addName.trim() || !addPrice) return;
    let categoryId = addCategory;
    if (showAddCustomCategory) {
      if (!addCustomCategory.trim()) return;
      const { data: newCat, error: catError } = await supabase
        .from("radiology_categories")
        .insert({ name: addCustomCategory.trim() })
        .select()
        .single();
      if (catError) { setErrorMsg(catError.message); return; }
      categoryId = newCat.id;
      queryClient.invalidateQueries({ queryKey: ["radiology-categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-categories-with-exams"] });
    }
    if (!categoryId) return;
    addMutation.mutate({
      name: addName.trim(),
      price: parseFloat(addPrice),
      categoryId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setErrorMsg(null); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-4 h-4" />
            Manage Examination Categories
          </DialogTitle>
          <DialogDescription>
            View, edit, or add radiology exam types and prices.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {Object.entries(groupedExams as Record<string, any[]>).map(([catName, catExams]) => (
            <div key={catName}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {catName}
              </h3>
              <div className="space-y-1">
                {catExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    {editingId === exam.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs flex-1"
                        />
                        <Input
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          type="number"
                          step="0.01"
                          className="h-8 text-xs w-24"
                        />
                        <SearchableSelect
                          value={editCategory}
                          onValueChange={(v) => {
                            setEditCategory(v);
                            setShowEditCustomCategory(v === "__others__");
                            if (v !== "__others__") setEditCustomCategory("");
                          }}
                          placeholder="Category"
                          options={[
                            ...(Array.isArray(categories) ? categories : []).map((c: any) => ({
                              value: c.id,
                              label: c.name,
                            })),
                            { value: "__others__", label: "OTHERS" },
                          ]}
                          triggerClassName="h-8 text-xs w-36"
                        />
                        {showEditCustomCategory && (
                          <Input
                            value={editCustomCategory}
                            onChange={(e) => setEditCustomCategory(e.target.value)}
                            placeholder="Type custom category..."
                            className="h-8 text-xs w-36"
                          />
                        )}
                        <button
                          onClick={() => handleUpdate(exam.id)}
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
                        <span className="flex-1 text-sm font-medium text-slate-800">{exam.name}</span>
                        <span className="text-xs font-mono text-slate-500 w-24 text-right">
                          ₦{Number(exam.price ?? 0).toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400 w-36 text-right">{catName}</span>
                        <button
                          onClick={() => startEditing(exam)}
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

          {Object.keys(groupedExams).length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No exams found.</p>
          )}
        </div>

        {/* Add Exam Inline Form */}
        {showAdd && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#005EB8]" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add New Examination</span>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name</Label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Bone Density Scan"
                  className="h-9 text-sm"
                />
              </div>
              <div className="min-w-[150px]">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</Label>
                <SearchableSelect
                  value={addCategory}
                  onValueChange={(v) => {
                    setAddCategory(v);
                    setShowAddCustomCategory(v === "__others__");
                    if (v !== "__others__") setAddCustomCategory("");
                  }}
                  placeholder="Select..."
                  options={[
                    ...(Array.isArray(categories) ? categories : []).map((c: any) => ({
                      value: c.id,
                      label: c.name,
                    })),
                    { value: "__others__", label: "OTHERS" },
                  ]}
                />
                {showAddCustomCategory && (
                  <Input
                    value={addCustomCategory}
                    onChange={(e) => setAddCustomCategory(e.target.value)}
                    placeholder="Type custom category..."
                    className="h-8 text-xs mt-2"
                  />
                )}
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
                  disabled={!addName.trim() || !addPrice || !addCategory || addMutation.isPending}
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
                    setAddPrice("");
                    setAddCategory("");
                    setShowAddCustomCategory(false);
                    setAddCustomCategory("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-200 pt-4">
          {!showAdd && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 gap-1.5 text-xs font-semibold"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Exam
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

export default ManageCategoriesDialog;

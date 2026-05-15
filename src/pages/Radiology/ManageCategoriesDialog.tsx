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
import { Plus, Pencil, Save, X, Scan } from "lucide-react";

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
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCategory, setAddCategory] = useState("");

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
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radiology-exams-all"] });
      queryClient.invalidateQueries({ queryKey: ["radiology-requests"] });
      setEditingId(null);
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, price, categoryId }: { name: string; price: number; categoryId: string }) => {
      const { error } = await supabase
        .from("radiology_exams")
        .insert({ name, price, category_id: categoryId, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radiology-exams-all"] });
      setShowAdd(false);
      setAddName("");
      setAddPrice("");
      setAddCategory("");
    },
  });

  const startEditing = (exam: any) => {
    setEditingId(exam.id);
    setEditName(exam.name);
    setEditPrice(String(exam.price ?? ""));
    setEditCategory(exam.categoryId ?? "");
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim() || !editPrice || !editCategory) return;
    updateMutation.mutate({
      id,
      name: editName.trim(),
      price: parseFloat(editPrice),
      categoryId: editCategory,
    });
  };

  const handleAdd = () => {
    if (!addName.trim() || !addPrice || !addCategory) return;
    addMutation.mutate({
      name: addName.trim(),
      price: parseFloat(addPrice),
      categoryId: addCategory,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
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

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {Object.entries(groupedExams).map(([catName, catExams]) => (
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
                          onValueChange={setEditCategory}
                          placeholder="Category"
                          options={(Array.isArray(categories) ? categories : []).map((c: any) => ({
                            value: c.id,
                            label: c.name,
                          }))}
                          triggerClassName="h-8 text-xs w-36"
                        />
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

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-200 pt-4">
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-4 gap-1.5 text-xs font-semibold"
            onClick={() => setShowAdd(!showAdd)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Exam
          </Button>
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Close
          </DialogClose>
        </DialogFooter>

        {/* Add Exam Modal */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Add New Examination</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</Label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Bone Density Scan"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</Label>
                <SearchableSelect
                  value={addCategory}
                  onValueChange={setAddCategory}
                  placeholder="Select category..."
                  options={(Array.isArray(categories) ? categories : []).map((c: any) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Price (₦)</Label>
                <Input
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" size="sm" />}>
                Cancel
              </DialogClose>
              <Button
                size="sm"
                className="bg-[#005EB8] hover:bg-[#004d9a] text-white"
                disabled={!addName.trim() || !addPrice || !addCategory || addMutation.isPending}
                onClick={handleAdd}
              >
                {addMutation.isPending ? "Adding..." : "Add Exam"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCategoriesDialog;

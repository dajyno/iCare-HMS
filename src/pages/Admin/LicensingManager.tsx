import React, { useEffect, useState } from "react";
import { adminSupabase } from "../../lib/adminSupabase";
import { toCamel } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, BedDouble, DollarSign, ShieldCheck, Pencil, Loader2, AlertCircle, X } from "lucide-react";
import type { SubscriptionTier } from "../../types/tenant";
import { ALL_MODULES } from "../../lib/moduleAccess";

const MODULE_LABELS: Record<string, string> = {
  emr: "EMR",
  reception: "Reception",
  billing: "Billing",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
  hmo_insurance: "HMO Insurance",
  multi_branch: "Multi-Branch",
  human_resources: "HR",
  accounting: "Accounting",
};

const LicensingManager: React.FC = () => {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);

  // Edit state
  const [editingTier, setEditingTier] = useState<SubscriptionTier | null>(null);
  const [editForm, setEditForm] = useState({ monthlyPrice: 0, maxStaffSeats: 0, maxBedCapacity: 0, description: "", allowedModules: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchTiers = () => {
    adminSupabase.from("subscription_tiers").select("*").then(({ data }) => {
      if (data) setTiers(data.map((d: any) => toCamel(d) as SubscriptionTier));
    });
  };

  useEffect(() => { fetchTiers(); }, []);

  const openEdit = (tier: SubscriptionTier) => {
    setEditingTier(tier);
    const raw = tier.allowedModules;
    const parsedModules: string[] = typeof raw === "string" ? JSON.parse(raw || "[]") : (raw ?? []);
    setEditForm({
      monthlyPrice: tier.monthlyPrice,
      maxStaffSeats: tier.maxStaffSeats,
      maxBedCapacity: tier.maxBedCapacity,
      description: tier.description || "",
      allowedModules: parsedModules,
    });
    setSaveError("");
  };

  const handleSave = async () => {
    if (!editingTier) return;
    setSaving(true);
    setSaveError("");

    try {
      const { error } = await adminSupabase
        .from("subscription_tiers")
        .update({
          monthly_price: editForm.monthlyPrice,
          max_staff_seats: editForm.maxStaffSeats,
          max_bed_capacity: editForm.maxBedCapacity,
          description: editForm.description || null,
          allowed_modules: JSON.stringify(editForm.allowedModules),
        })
        .eq("id", editingTier.id);

      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
    } catch (err: any) {
      setSaveError(err.message || "Network error — please check your connection and try again.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditingTier(null);
    fetchTiers();
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Subscription & Plans</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const raw = tier.allowedModules;
          const modules: string[] = typeof raw === "string" ? JSON.parse(raw || "[]") : (raw ?? []);
          return (
            <Card key={tier.id} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-white">{tier.name}</CardTitle>
                  <Badge variant="outline" className="text-sky-400 border-sky-500/30 bg-sky-500/10">
                    {'\u20A6'}{tier.monthlyPrice.toLocaleString()}/mo
                  </Badge>
                </div>
                {tier.description && (
                  <p className="text-xs text-slate-400 mt-1">{tier.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Max Staff Seats</p>
                    <p className="text-white font-semibold">{tier.maxStaffSeats >= 99999 ? "Unlimited" : tier.maxStaffSeats}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <BedDouble className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Max Bed Capacity</p>
                    <p className="text-white font-semibold">{tier.maxBedCapacity >= 99999 ? "Unlimited" : tier.maxBedCapacity}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Monthly Price</p>
                    <p className="text-white font-semibold">{'\u20A6'}{tier.monthlyPrice.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Included Modules</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {modules.length > 0 ? (
                      modules.map((mod) => (
                        <span
                          key={mod}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20"
                        >
                          {MODULE_LABELS[mod] || mod}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">No modules defined</span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => openEdit(tier)}
                  className="w-full mt-2 bg-sky-600 hover:bg-sky-700 text-sm font-bold"
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit Plan
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Tier Modal */}
      <Dialog open={!!editingTier} onOpenChange={(o) => !o && setEditingTier(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Plan — {editingTier?.name}</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Update pricing, limits, and description for this subscription tier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto px-0.5">
            {saveError && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {saveError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Price ({'\u20A6'})</Label>
              <Input
                type="number"
                min={0}
                value={editForm.monthlyPrice}
                onChange={(e) => setEditForm({ ...editForm, monthlyPrice: parseInt(e.target.value) || 0 })}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Staff Seats</Label>
              <Input
                type="number"
                min={0}
                value={editForm.maxStaffSeats}
                onChange={(e) => setEditForm({ ...editForm, maxStaffSeats: parseInt(e.target.value) || 0 })}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Bed Capacity</Label>
              <Input
                type="number"
                min={0}
                value={editForm.maxBedCapacity}
                onChange={(e) => setEditForm({ ...editForm, maxBedCapacity: parseInt(e.target.value) || 0 })}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="bg-slate-900/50 border-slate-600 text-slate-100 min-h-[60px]"
                placeholder="Brief description of this plan..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Included Modules</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {ALL_MODULES.map((mod) => (
                  <label key={mod} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.allowedModules.includes(mod)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditForm({ ...editForm, allowedModules: [...editForm.allowedModules, mod] });
                        } else {
                          setEditForm({ ...editForm, allowedModules: editForm.allowedModules.filter((m) => m !== mod) });
                        }
                      }}
                      className="rounded bg-slate-700 border-slate-500"
                    />
                    {mod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setEditingTier(null)} className="text-slate-400">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LicensingManager;

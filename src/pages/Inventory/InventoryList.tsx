import { useQuery } from "@tanstack/react-query";
import { supabase, toCamel } from "@/src/lib/supabase";
import { 
  Package, 
  Search, 
  AlertTriangle, 
  ArrowUpRight,
  Truck,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const InventoryList = () => {
  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, supplier:suppliers(*)")
        .order("name", { ascending: true });
      if (error) throw error;
      return toCamel(data);
    },
  });

  if (isLoading) return <div className="p-12 text-center text-slate-400">Loading inventory...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Inventory</h1>
          <p className="text-sm text-slate-500">Manage medical supplies, stock levels and suppliers</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Truck className="w-4 h-4 mr-2" /> Suppliers</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 font-bold"><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-rose-600">8 Items</div>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-slate-900">$42,500</div>
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">3 POs</div>
            <Truck className="w-5 h-5 text-blue-500" />
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search items, SKU, category..." className="pl-9 bg-white h-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left">Item Name</th>
                <th className="px-6 py-3 text-left">SKU</th>
                <th className="px-6 py-3 text-left">Stock Level</th>
                <th className="px-6 py-3 text-left">Unit</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!Array.isArray(items) || items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    {!Array.isArray(items) ? "Error loading inventory items." : "No inventory items found."}
                  </td>
                </tr>
              ) : (
                items.map((item: any) => {
                  const isLow = item.quantity <= item.reorderLevel;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          <span className="text-xs text-slate-500 tracking-tight">{item.supplier?.name || "No Supplier"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 capitalize">{item.sku || "N/A"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>{item.quantity?.toLocaleString()}</span>
                          {isLow && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 text-[9px] h-4">Low Stock</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 uppercase text-[10px] font-bold">{item.unit || "unit"}</td>
                      <td className="px-6 py-4">
                        <Badge className="bg-emerald-50 text-emerald-700">Active</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <Button variant="ghost" size="sm" className="text-blue-600 h-8 font-bold">Manage</Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryList;

import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { inr } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent", value: 10, min_order: 0, max_discount: "", expiry: "", usage_limit: "", active: true });

  const load = () => api.get("/coupons").then((r) => setCoupons(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.code.trim()) { toast.error("Code required"); return; }
    try {
      await api.post("/coupons", { ...form, value: Number(form.value), min_order: Number(form.min_order),
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        expiry: form.expiry || null });
      toast.success("Coupon created"); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };
  const del = async (c) => { if (!window.confirm(`Delete ${c.code}?`)) return; await api.delete(`/coupons/${c.id}`); toast.success("Deleted"); load(); };
  const inp = "w-full px-3 py-2 rounded-lg border border-sand outline-none focus:border-sunset text-sm";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-playfair text-3xl font-bold text-ocean">Coupons</h1>
        <button onClick={() => setOpen(true)} data-testid="add-coupon" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sunset text-white font-semibold text-sm"><Plus size={18} /> Add</button>
      </div>
      <div className="bg-white rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand/60 text-left"><tr><th className="p-3">Code</th><th className="p-3">Discount</th><th className="p-3">Min Order</th><th className="p-3">Used</th><th className="p-3">Active</th><th className="p-3"></th></tr></thead>
          <tbody>{coupons.map((c) => (
            <tr key={c.id} className="border-t border-sand" data-testid={`coupon-${c.code}`}>
              <td className="p-3 font-semibold text-ocean">{c.code}</td>
              <td className="p-3">{c.type === "percent" ? `${c.value}%` : inr(c.value)}{c.max_discount ? ` (max ${inr(c.max_discount)})` : ""}</td>
              <td className="p-3">{inr(c.min_order)}</td>
              <td className="p-3">{c.used}{c.usage_limit ? `/${c.usage_limit}` : ""}</td>
              <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-green-100 text-green-700" : "bg-sand"}`}>{c.active ? "Active" : "Off"}</span></td>
              <td className="p-3"><button onClick={() => del(c)} className="text-destructive"><Trash2 size={16} /></button></td>
            </tr>
          ))}</tbody>
        </table>
        {coupons.length === 0 && <p className="p-8 text-center text-charcoal/40">No coupons yet.</p>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-playfair text-ocean">New Coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} data-testid="coupon-code" />
            <div className="grid grid-cols-2 gap-3">
              <select className={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="percent">Percentage</option><option value="flat">Flat ₹</option></select>
              <input className={inp} type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              <input className={inp} type="number" placeholder="Min Order" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
              <input className={inp} type="number" placeholder="Max Discount (opt)" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
              <input className={inp} type="date" value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
              <input className={inp} type="number" placeholder="Usage Limit (opt)" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
            </div>
            <button onClick={save} className="w-full py-3 rounded-full bg-sunset text-white font-semibold" data-testid="save-coupon">Create Coupon</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

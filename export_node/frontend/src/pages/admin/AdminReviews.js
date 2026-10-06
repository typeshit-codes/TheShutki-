import React, { useEffect, useState } from "react";
import { Plus, Trash2, Star, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", rating: 5, text: "", verified: true, active: true });

  const load = () => api.get("/reviews?all=true").then((r) => setReviews(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.text.trim()) { toast.error("Name and text required"); return; }
    await api.post("/reviews", { ...form, rating: Number(form.rating) }); toast.success("Review added"); setOpen(false);
    setForm({ name: "", rating: 5, text: "", verified: true, active: true }); load();
  };
  const toggle = async (r) => { await api.put(`/reviews/${r.id}`, { ...r, active: !r.active }); load(); };
  const del = async (r) => { if (!window.confirm("Delete review?")) return; await api.delete(`/reviews/${r.id}`); toast.success("Deleted"); load(); };
  const inp = "w-full px-3 py-2 rounded-lg border border-sand outline-none focus:border-sunset text-sm";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-playfair text-3xl font-bold text-ocean">Reviews</h1>
        <button onClick={() => setOpen(true)} data-testid="add-review" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sunset text-white font-semibold text-sm"><Plus size={18} /> Add</button>
      </div>
      <p className="text-xs text-charcoal/50 mb-4">Placeholder reviews for development. Only publish genuine reviews in production.</p>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl shadow-soft p-4 flex justify-between items-start gap-4" data-testid={`review-${r.id}`}>
            <div>
              <div className="flex gap-0.5 mb-1">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={13} className="fill-sunset text-sunset" />)}</div>
              <p className="text-sm text-charcoal/80">{r.text}</p>
              <p className="text-xs font-semibold text-ocean mt-1">{r.name} {r.verified && <span className="text-green-600">✓</span>} {!r.active && <span className="text-charcoal/40">(hidden)</span>}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => toggle(r)} className="text-ocean">{r.active ? <Eye size={16} /> : <EyeOff size={16} />}</button>
              <button onClick={() => del(r)} className="text-destructive"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-playfair text-ocean">Add Review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="Customer Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="review-name" />
            <select className={inp} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Stars</option>)}</select>
            <textarea className={`${inp} min-h-24`} placeholder="Review text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} data-testid="review-text" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} /> Verified Buyer</label>
            <button onClick={save} className="w-full py-3 rounded-full bg-sunset text-white font-semibold" data-testid="save-review">Add Review</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminCategories() {
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", image: "", order: 0 });

  const load = () => api.get("/categories").then((r) => setCats(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    try {
      if (editing) await api.put(`/categories/${editing.id}`, form);
      else await api.post("/categories", form);
      toast.success("Saved"); setOpen(false); load();
    } catch { toast.error("Failed"); }
  };
  const del = async (c) => { if (!window.confirm(`Delete ${c.name}?`)) return; await api.delete(`/categories/${c.id}`); toast.success("Deleted"); load(); };
  const inp = "w-full px-3 py-2 rounded-lg border border-sand outline-none focus:border-sunset text-sm";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-playfair text-3xl font-bold text-ocean">Categories</h1>
        <button onClick={() => { setEditing(null); setForm({ name: "", image: "", order: cats.length }); setOpen(true); }} data-testid="add-category" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sunset text-white font-semibold text-sm"><Plus size={18} /> Add</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cats.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl shadow-soft overflow-hidden" data-testid={`admin-cat-${c.slug}`}>
            <img src={c.image} alt={c.name} className="aspect-video w-full object-cover" />
            <div className="p-3 flex justify-between items-center"><span className="font-medium text-ocean text-sm">{c.name}</span>
              <div className="flex gap-2"><button onClick={() => { setEditing(c); setForm(c); setOpen(true); }} className="text-ocean"><Pencil size={15} /></button><button onClick={() => del(c)} className="text-destructive"><Trash2 size={15} /></button></div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-playfair text-ocean">{editing ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="cat-name" />
            <input className={inp} placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            <input className={inp} type="number" placeholder="Order" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            {form.image && <img src={form.image} alt="" className="w-full aspect-video object-cover rounded-lg" />}
            <button onClick={save} className="w-full py-3 rounded-full bg-sunset text-white font-semibold" data-testid="save-category">Save</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

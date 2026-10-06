import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const empty = { title: "", subtitle: "", image: "", time: "", serves: "", difficulty: "Easy", fish_used: "", ingredients: [], steps: [], featured: true, order: 0 };

export default function AdminRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/recipes").then((r) => setRecipes(r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ ...empty, ...r }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    const payload = {
      ...form,
      ingredients: typeof form.ingredients === "string" ? form.ingredients.split("\n").map((s) => s.trim()).filter(Boolean) : form.ingredients,
      steps: typeof form.steps === "string" ? form.steps.split("\n").map((s) => s.trim()).filter(Boolean) : form.steps,
    };
    try {
      if (editing) await api.put(`/recipes/${editing.id}`, payload);
      else await api.post("/recipes", payload);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setSaving(false); }
  };
  const del = async (r) => { if (!window.confirm(`Delete "${r.title}"?`)) return; await api.delete(`/recipes/${r.id}`); toast.success("Deleted"); load(); };
  const inp = "w-full px-3 py-2 rounded-lg border border-sand outline-none focus:border-sunset text-sm";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-playfair text-3xl font-bold text-ocean">Recipes ({recipes.length})</h1>
        <button onClick={openNew} data-testid="add-recipe" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sunset text-white font-semibold text-sm"><Plus size={18} /> Add Recipe</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recipes.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl shadow-soft overflow-hidden" data-testid={`admin-recipe-${r.slug}`}>
            <img src={r.image} alt={r.title} className="aspect-video w-full object-cover" />
            <div className="p-4">
              <p className="font-playfair font-bold text-ocean">{r.title}</p>
              <p className="text-xs text-charcoal/50 line-clamp-2 mt-1">{r.subtitle}</p>
              <div className="flex gap-2 mt-3"><button onClick={() => openEdit(r)} className="text-ocean"><Pencil size={15} /></button><button onClick={() => del(r)} className="text-destructive"><Trash2 size={15} /></button></div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-playfair text-ocean">{editing ? "Edit" : "Add"} Recipe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <input className={inp} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="recipe-title" />
            <input className={inp} placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            <input className={inp} placeholder="Image URL" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            {form.image && <img src={form.image} alt="" className="w-full aspect-video object-cover rounded-lg" />}
            <div className="grid grid-cols-2 gap-3">
              <input className={inp} placeholder="Time (e.g. 35 min)" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              <input className={inp} placeholder="Serves" value={form.serves} onChange={(e) => setForm({ ...form, serves: e.target.value })} />
              <select className={inp} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option>Easy</option><option>Medium</option><option>Advanced</option></select>
              <input className={inp} placeholder="Fish Used" value={form.fish_used} onChange={(e) => setForm({ ...form, fish_used: e.target.value })} />
            </div>
            <textarea className={`${inp} min-h-28`} placeholder="Ingredients (one per line)" value={Array.isArray(form.ingredients) ? form.ingredients.join("\n") : form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} data-testid="recipe-ingredients" />
            <textarea className={`${inp} min-h-32`} placeholder="Steps (one per line)" value={Array.isArray(form.steps) ? form.steps.join("\n") : form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} data-testid="recipe-steps" />
            <button onClick={save} disabled={saving} data-testid="save-recipe" className="w-full py-3 rounded-full bg-sunset text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">{saving && <Loader2 size={16} className="animate-spin" />} Save Recipe</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Upload } from "lucide-react";
import { toast } from "sonner";
import api, { inr, formatApiError } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const empty = {
  name: "", bengali_name: "", description: "", long_description: "", category: "Dry Fish",
  fish_type: "", salt_level: "Regular", images: [], badge: "", tags: [],
  variants: [{ weight: "250g", price: 0, mrp: 0, stock: 100, sku: "" }],
  rating: 4.7, reviews_count: 0, is_featured: false, is_bestseller: false, is_combo: false, is_new: false,
  storage_instructions: "", preparation_instructions: "", ingredients: "",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () => api.get("/products").then((r) => setProducts(r.data));
  useEffect(() => { load(); api.get("/categories").then((r) => setCats(r.data)); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...empty, ...p, tags: p.tags || [] }); setOpen(true); };

  const setV = (i, k, val) => setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => idx === i ? { ...v, [k]: val } : v) }));
  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { weight: "", price: 0, mrp: 0, stock: 100, sku: "" }] }));
  const rmVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  const uploadImg = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = (process.env.REACT_APP_BACKEND_URL || "") + data.url;
      setForm((f) => ({ ...f, images: [...f.images, url] }));
      toast.success("Image uploaded");
    } catch (err) { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Product name required"); return; }
    setSaving(true);
    const payload = {
      ...form,
      tags: typeof form.tags === "string" ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : form.tags,
      variants: form.variants.map((v) => ({ ...v, price: Number(v.price), mrp: Number(v.mrp), stock: Number(v.stock) })),
      rating: Number(form.rating), reviews_count: Number(form.reviews_count),
    };
    try {
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post("/products", payload);
      toast.success(editing ? "Product updated" : "Product created");
      setOpen(false); load();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); } finally { setSaving(false); }
  };

  const del = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await api.delete(`/products/${p.id}`); toast.success("Deleted"); load();
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-sand outline-none focus:border-sunset text-sm";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-playfair text-3xl font-bold text-ocean">Products ({products.length})</h1>
        <button onClick={openNew} data-testid="add-product-btn" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sunset text-white font-semibold text-sm"><Plus size={18} /> Add Product</button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand/60 text-left"><tr>
            <th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Flags</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-sand" data-testid={`admin-product-${p.slug}`}>
                <td className="p-3"><div className="flex items-center gap-3"><img src={(p.images || [])[0]} alt="" className="w-10 h-10 rounded-lg object-cover" /><span className="font-medium text-charcoal">{p.name}</span></div></td>
                <td className="p-3 text-charcoal/60">{p.category}</td>
                <td className="p-3 font-semibold text-ocean">{inr((p.variants || [])[0]?.price)}</td>
                <td className="p-3">{(p.variants || []).reduce((s, v) => s + (v.stock || 0), 0)}</td>
                <td className="p-3"><div className="flex gap-1 flex-wrap">{p.is_bestseller && <span className="text-[10px] bg-sunset/10 text-sunset px-1.5 py-0.5 rounded">BEST</span>}{p.is_featured && <span className="text-[10px] bg-ocean/10 text-ocean px-1.5 py-0.5 rounded">FEAT</span>}{p.is_combo && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">COMBO</span>}</div></td>
                <td className="p-3"><div className="flex gap-2"><button onClick={() => openEdit(p)} data-testid={`edit-${p.slug}`} className="text-ocean hover:text-sunset"><Pencil size={16} /></button><button onClick={() => del(p)} data-testid={`delete-${p.slug}`} className="text-charcoal/40 hover:text-destructive"><Trash2 size={16} /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-playfair text-ocean">{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className={inp} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="form-name" />
              <input className={inp} placeholder="Bengali Name" value={form.bengali_name} onChange={(e) => setForm({ ...form, bengali_name: e.target.value })} data-testid="form-bengali" />
            </div>
            <input className={inp} placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <textarea className={`${inp} min-h-20`} placeholder="Long description" value={form.long_description} onChange={(e) => setForm({ ...form, long_description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <select className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {cats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input className={inp} placeholder="Fish Type" value={form.fish_type} onChange={(e) => setForm({ ...form, fish_type: e.target.value })} />
              <select className={inp} value={form.salt_level} onChange={(e) => setForm({ ...form, salt_level: e.target.value })}>
                <option>Regular</option><option>Low Salt</option>
              </select>
              <input className={inp} placeholder="Badge (e.g. BESTSELLER)" value={form.badge || ""} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
            </div>
            <input className={inp} placeholder="Tags (comma separated)" value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />

            {/* Images */}
            <div>
              <p className="text-xs uppercase tracking-widest text-ocean/60 font-semibold mb-2">Images</p>
              <div className="flex gap-2 flex-wrap">
                {form.images.map((img, i) => (
                  <div key={i} className="relative"><img src={img} alt="" className="w-16 h-16 rounded-lg object-cover" /><button onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })} className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5"><X size={12} /></button></div>
                ))}
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-sand flex items-center justify-center cursor-pointer hover:border-sunset" data-testid="upload-image">
                  {uploading ? <Loader2 size={18} className="animate-spin text-sunset" /> : <Upload size={18} className="text-ocean/50" />}
                  <input type="file" accept="image/*" className="hidden" onChange={uploadImg} />
                </label>
              </div>
              <input className={`${inp} mt-2`} placeholder="Or paste image URL + Enter" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value) { setForm({ ...form, images: [...form.images, e.target.value] }); e.target.value = ""; } }} />
            </div>

            {/* Variants */}
            <div>
              <div className="flex justify-between items-center mb-2"><p className="text-xs uppercase tracking-widest text-ocean/60 font-semibold">Variants</p><button onClick={addVariant} className="text-sunset text-xs font-semibold flex items-center gap-1"><Plus size={14} /> Add</button></div>
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  <input className={inp} placeholder="Weight" value={v.weight} onChange={(e) => setV(i, "weight", e.target.value)} />
                  <input className={inp} type="number" placeholder="Price" value={v.price} onChange={(e) => setV(i, "price", e.target.value)} />
                  <input className={inp} type="number" placeholder="MRP" value={v.mrp} onChange={(e) => setV(i, "mrp", e.target.value)} />
                  <input className={inp} type="number" placeholder="Stock" value={v.stock} onChange={(e) => setV(i, "stock", e.target.value)} />
                  <button onClick={() => rmVariant(i)} className="text-destructive"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <textarea className={`${inp} min-h-16`} placeholder="Storage instructions" value={form.storage_instructions} onChange={(e) => setForm({ ...form, storage_instructions: e.target.value })} />
            <textarea className={`${inp} min-h-16`} placeholder="Preparation instructions" value={form.preparation_instructions} onChange={(e) => setForm({ ...form, preparation_instructions: e.target.value })} />
            <input className={inp} placeholder="Ingredients" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} />

            <div className="flex gap-4 flex-wrap text-sm">
              {[["is_bestseller", "Bestseller"], ["is_featured", "Featured"], ["is_combo", "Combo"], ["is_new", "New"]].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} data-testid={`flag-${k}`} /> {l}</label>
              ))}
            </div>

            <button onClick={save} disabled={saving} data-testid="save-product" className="w-full py-3 rounded-full bg-sunset text-white font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />} {editing ? "Update Product" : "Create Product"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

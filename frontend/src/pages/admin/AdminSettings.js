import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useStore } from "@/context/store";

export default function AdminSettings() {
  const { refreshSettings } = useStore();
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/settings").then((r) => setS(r.data || {})); }, []);
  if (!s) return <p className="text-ocean">Loading…</p>;

  const set = (k) => (e) => setS({ ...s, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });
  const setPay = (k) => (e) => setS({ ...s, payment_methods: { ...(s.payment_methods || {}), [k]: e.target.checked } });
  const setSocial = (i) => (e) => { const arr = [...(s.social_images || [])]; arr[i] = e.target.value; setS({ ...s, social_images: arr }); };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", s); refreshSettings(); toast.success("Settings saved");
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-sand outline-none focus:border-sunset text-sm";
  const Card = ({ title, children }) => (
    <div className="bg-white rounded-2xl shadow-soft p-6"><h2 className="font-playfair text-lg font-bold text-ocean mb-4">{title}</h2><div className="space-y-3">{children}</div></div>
  );
  const Field = ({ label, k, type = "text", area }) => (
    <div><label className="text-xs uppercase tracking-widest text-ocean/60 font-semibold">{label}</label>
      {area ? <textarea className={`${inp} mt-1 min-h-20`} value={s[k] || ""} onChange={set(k)} data-testid={`set-${k}`} />
            : <input className={`${inp} mt-1`} type={type} value={s[k] ?? ""} onChange={set(k)} data-testid={`set-${k}`} />}
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-playfair text-3xl font-bold text-ocean">Store Settings</h1>
        <button onClick={save} disabled={saving} data-testid="save-settings" className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-sunset text-white font-semibold text-sm disabled:opacity-60">{saving && <Loader2 size={16} className="animate-spin" />} Save Changes</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Homepage Hero">
          <Field label="Hero Title (use line breaks)" k="hero_title" area />
          <Field label="Hero Subtitle" k="hero_subtitle" area />
          <Field label="Hero Image URL" k="hero_image" />
          {s.hero_image && <img src={s.hero_image} alt="" className="w-full aspect-video object-cover rounded-lg" />}
        </Card>

        <Card title="Announcement & Promo">
          <Field label="Top Announcement Bar" k="announcement" />
          <Field label="Promo Text" k="promo_text" />
        </Card>

        <Card title="Shipping & Offers">
          <Field label="Free Shipping Above (₹)" k="free_shipping_above" type="number" />
          <Field label="Shipping Charge (₹)" k="shipping_charge" type="number" />
          <Field label="First Order Discount (%)" k="first_order_discount" type="number" />
        </Card>

        <Card title="Payment Methods">
          {[["cod", "Cash on Delivery"], ["upi", "UPI / QR Code"], ["razorpay", "Razorpay"], ["stripe", "Stripe"], ["cashfree", "Cashfree"], ["phonepe", "PhonePe"]].map(([k, l]) => (
            <label key={k} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!!(s.payment_methods || {})[k]} onChange={setPay(k)} data-testid={`pay-${k}`} /> {l}</label>
          ))}
          <Field label="UPI ID (for QR)" k="upi_id" />
          <Field label="UPI Payee Name" k="upi_name" />
          <p className="text-xs text-charcoal/40">COD & UPI work out of the box. Razorpay/Stripe/Cashfree/PhonePe require API keys to be configured before going live.</p>
        </Card>

        <Card title="Contact & WhatsApp">
          <Field label="WhatsApp Number (with country code)" k="whatsapp_number" />
          <Field label="Phone" k="phone" />
          <Field label="Email" k="email" />
          <Field label="Business Address" k="address" area />
        </Card>

        <Card title="Social Links">
          <Field label="Instagram URL" k="instagram" />
          <Field label="Facebook URL" k="facebook" />
          <Field label="YouTube URL" k="youtube" />
        </Card>

        <Card title="Instagram / Social Grid Images">
          {(s.social_images || []).map((img, i) => (
            <input key={i} className={inp} value={img} onChange={setSocial(i)} placeholder={`Image ${i + 1} URL`} />
          ))}
          <button onClick={() => setS({ ...s, social_images: [...(s.social_images || []), ""] })} className="text-sunset text-sm font-semibold">+ Add image slot</button>
        </Card>
      </div>
    </div>
  );
}

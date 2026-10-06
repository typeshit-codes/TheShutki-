import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Loader2, Wallet, Smartphone, CreditCard } from "lucide-react";
import { toast } from "sonner";
import api, { inr, formatApiError } from "@/lib/api";
import { useStore } from "@/context/store";

export default function Checkout() {
  const { cart, cartSubtotal, clearCart, settings, user } = useStore();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.name || "", phone: user?.phone || "", email: user?.email || "",
    address: "", city: "", state: "", pincode: "",
  });
  const [payment, setPayment] = useState("cod");

  const methods = settings.payment_methods || { cod: true, upi: true };
  const enabled = [
    methods.cod && ["cod", "Cash on Delivery", Wallet],
    methods.upi && ["upi", "UPI / QR Code", Smartphone],
    methods.razorpay && ["razorpay", "Card / Netbanking (Razorpay)", CreditCard],
    methods.stripe && ["stripe", "Card (Stripe)", CreditCard],
  ].filter(Boolean);

  const coupon = state?.coupon;
  // estimate (server recomputes authoritatively)
  const freeAbove = settings.free_shipping_above || 499;
  const shipping = cartSubtotal >= freeAbove ? 0 : (settings.shipping_charge || 49);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid = () => {
    if (!form.full_name.trim()) return "Please enter your full name";
    if (!/^\d{10}$/.test(form.phone)) return "Enter a valid 10-digit mobile number";
    if (!form.address.trim()) return "Please enter your address";
    if (!form.city.trim()) return "Please enter your city";
    if (!form.state.trim()) return "Please enter your state";
    if (!/^\d{6}$/.test(form.pincode)) return "Enter a valid 6-digit pincode";
    return null;
  };

  const placeOrder = async () => {
    const err = valid();
    if (err) { toast.error(err); return; }
    if (payment === "razorpay" || payment === "stripe") {
      toast.error("This payment method isn't configured yet. Please use COD or UPI.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/orders", {
        items: cart.map((i) => ({ product_id: i.product_id, name: i.name, weight: i.weight, price: i.price, quantity: i.quantity, image: i.image })),
        ...form, payment_method: payment, coupon_code: coupon,
      });
      clearCart();
      navigate(`/order-confirmation/${data.order_id}`, { state: { payment: data } });
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setSubmitting(false); }
  };

  if (cart.length === 0) {
    return <div className="max-w-xl mx-auto px-5 py-24 text-center"><p className="text-charcoal/60">Your cart is empty.</p><Link to="/shop" className="inline-block mt-4 px-6 py-3 rounded-full bg-sunset text-white font-semibold">Shop Now</Link></div>;
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-sand outline-none focus:border-sunset bg-white";

  return (
    <div className="max-w-[1440px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl font-bold text-ocean mb-8">Checkout</h1>
      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-8">
          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="font-playfair text-xl font-bold text-ocean mb-5">Shipping Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <input className={inputCls} placeholder="Full Name" value={form.full_name} onChange={set("full_name")} data-testid="checkout-name" />
              <input className={inputCls} placeholder="Mobile Number" value={form.phone} onChange={set("phone")} data-testid="checkout-phone" maxLength={10} />
              <input className={`${inputCls} md:col-span-2`} placeholder="Email (optional)" value={form.email} onChange={set("email")} data-testid="checkout-email" />
              <input className={`${inputCls} md:col-span-2`} placeholder="Address (House no, Street, Area)" value={form.address} onChange={set("address")} data-testid="checkout-address" />
              <input className={inputCls} placeholder="City" value={form.city} onChange={set("city")} data-testid="checkout-city" />
              <input className={inputCls} placeholder="State" value={form.state} onChange={set("state")} data-testid="checkout-state" />
              <input className={inputCls} placeholder="Pincode" value={form.pincode} onChange={set("pincode")} data-testid="checkout-pincode" maxLength={6} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <h2 className="font-playfair text-xl font-bold text-ocean mb-5">Payment Method</h2>
            <div className="space-y-3">
              {enabled.map(([val, label, Icon]) => (
                <button key={val} onClick={() => setPayment(val)} data-testid={`payment-${val}`}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${payment === val ? "border-sunset bg-sunset/5" : "border-sand"}`}>
                  <Icon size={20} className="text-ocean" />
                  <span className="font-medium text-charcoal">{label}</span>
                  <span className={`ml-auto h-5 w-5 rounded-full border-2 ${payment === val ? "border-sunset bg-sunset" : "border-sand"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6 h-fit lg:sticky lg:top-28">
          <h2 className="font-playfair text-xl font-bold text-ocean mb-5">Order Summary</h2>
          <div className="space-y-3 max-h-56 overflow-y-auto mb-4">
            {cart.map((i) => (
              <div key={i.key} className="flex gap-3 items-center">
                <img src={i.image} alt={i.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-charcoal truncate">{i.name}</p><p className="text-xs text-charcoal/50">{i.weight} × {i.quantity}</p></div>
                <span className="text-sm font-semibold">{inr(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm border-t border-sand pt-4">
            <div className="flex justify-between"><span className="text-charcoal/60">Subtotal</span><span>{inr(cartSubtotal)}</span></div>
            {coupon && <div className="flex justify-between text-green-600"><span>Coupon {coupon}</span><span>applied</span></div>}
            <div className="flex justify-between"><span className="text-charcoal/60">Shipping</span><span>{shipping === 0 ? "FREE" : inr(shipping)}</span></div>
            <div className="flex justify-between text-lg font-bold text-ocean border-t border-sand pt-2"><span>Total</span><span>{inr(cartSubtotal + shipping)}</span></div>
            <p className="text-xs text-charcoal/40">Final total incl. discounts is confirmed on the next step.</p>
          </div>
          <button onClick={placeOrder} disabled={submitting} data-testid="place-order"
            className="w-full mt-6 py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Placing Order…</> : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

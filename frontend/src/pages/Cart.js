import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, Tag } from "lucide-react";
import { toast } from "sonner";
import api, { inr, formatApiError } from "@/lib/api";
import { useStore } from "@/context/store";

export default function Cart() {
  const { cart, updateQty, removeFromCart, cartSubtotal, settings } = useStore();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(null);
  const [applying, setApplying] = useState(false);

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setApplying(true);
    try {
      const { data } = await api.post("/coupons/validate", { code: coupon.trim(), subtotal: cartSubtotal });
      setApplied(data);
      toast.success(`Coupon ${data.code} applied! You saved ${inr(data.discount)}`);
    } catch (e) {
      setApplied(null);
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setApplying(false); }
  };

  const discount = applied?.discount || 0;
  const freeAbove = settings.free_shipping_above || 499;
  const shipping = (cartSubtotal - discount) >= freeAbove ? 0 : (settings.shipping_charge || 49);
  const total = Math.max(0, cartSubtotal - discount) + shipping;

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center" data-testid="empty-cart">
        <ShoppingBag size={64} className="mx-auto text-ocean/20 mb-5" />
        <h1 className="font-playfair text-3xl font-bold text-ocean">Your cart is empty</h1>
        <p className="text-charcoal/60 mt-2">Looks like you haven't added any Shutki yet.</p>
        <Link to="/shop" className="inline-block mt-6 px-8 py-3 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl font-bold text-ocean mb-8">Shopping Cart</h1>
      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-4">
          {cart.map((i) => (
            <div key={i.key} className="flex gap-4 bg-white rounded-2xl shadow-soft p-4" data-testid={`cart-item-${i.key}`}>
              <img src={i.image} alt={i.name} className="w-24 h-24 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <Link to={`/products/${i.slug}`} className="font-playfair font-semibold text-ocean hover:text-sunset transition-colors">{i.name}</Link>
                <p className="text-sm text-charcoal/50">{i.weight}</p>
                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <div className="flex items-center border border-sand rounded-full">
                    <button onClick={() => updateQty(i.key, i.quantity - 1)} className="h-8 w-8 flex items-center justify-center text-ocean" data-testid={`cart-minus-${i.key}`}><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                    <button onClick={() => updateQty(i.key, i.quantity + 1)} className="h-8 w-8 flex items-center justify-center text-ocean" data-testid={`cart-plus-${i.key}`}><Plus size={14} /></button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-ocean">{inr(i.price * i.quantity)}</span>
                    <button onClick={() => removeFromCart(i.key)} className="text-charcoal/40 hover:text-destructive transition-colors" data-testid={`cart-remove-${i.key}`}><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Link to="/shop" className="inline-block text-ocean font-medium hover:text-sunset transition-colors">← Continue Shopping</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6 h-fit lg:sticky lg:top-28">
          <h2 className="font-playfair text-xl font-bold text-ocean mb-5">Order Summary</h2>
          <div className="flex gap-2 mb-5">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" data-testid="coupon-input"
              className="flex-1 px-4 py-2.5 rounded-full border border-sand outline-none focus:border-sunset text-sm" />
            <button onClick={applyCoupon} disabled={applying} data-testid="apply-coupon" className="px-5 py-2.5 rounded-full bg-ocean text-cream text-sm font-semibold disabled:opacity-60">Apply</button>
          </div>
          {applied && <p className="text-xs text-green-600 flex items-center gap-1 mb-3" data-testid="coupon-applied"><Tag size={12} /> {applied.code} applied</p>}
          <div className="space-y-3 text-sm border-t border-sand pt-4">
            <div className="flex justify-between"><span className="text-charcoal/60">Subtotal</span><span className="font-medium" data-testid="cart-subtotal">{inr(cartSubtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{inr(discount)}</span></div>}
            <div className="flex justify-between"><span className="text-charcoal/60">Shipping</span><span className="font-medium">{shipping === 0 ? "FREE" : inr(shipping)}</span></div>
            <div className="flex justify-between text-lg font-bold text-ocean border-t border-sand pt-3"><span>Total</span><span data-testid="cart-total">{inr(total)}</span></div>
          </div>
          <button onClick={() => navigate("/checkout", { state: { coupon: applied?.code } })} data-testid="proceed-to-checkout"
            className="w-full mt-6 py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors">Proceed to Checkout</button>
        </div>
      </div>
    </div>
  );
}

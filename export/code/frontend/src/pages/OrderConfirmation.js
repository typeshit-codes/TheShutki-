import React, { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { CheckCircle2, Package } from "lucide-react";
import api, { inr } from "@/lib/api";
import OrderTimeline from "@/components/OrderTimeline";

export default function OrderConfirmation() {
  const { orderId } = useParams();
  const { state } = useLocation();
  const [order, setOrder] = useState(null);
  const payment = state?.payment;

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/orders/${orderId}`).then((r) => setOrder(r.data)).catch(() => {});
  }, [orderId]);

  return (
    <div className="max-w-2xl mx-auto px-5 py-14 md:py-20 text-center" data-testid="order-confirmation">
      <CheckCircle2 size={72} className="mx-auto text-green-500 mb-5" />
      <h1 className="font-playfair text-3xl md:text-4xl font-bold text-ocean">Thank you for your order!</h1>
      <p className="text-charcoal/60 mt-2">Your order <span className="font-semibold text-ocean" data-testid="confirm-order-id">#{orderId}</span> has been placed successfully.</p>

      {payment?.qr && (
        <div className="mt-8 bg-white rounded-2xl shadow-soft p-6 inline-block">
          <p className="font-playfair text-lg font-bold text-ocean mb-1">Scan to Pay via UPI</p>
          <p className="text-sm text-charcoal/60 mb-4">Amount: <span className="font-bold text-ocean">{inr(payment.total)}</span></p>
          <img src={payment.qr} alt="UPI QR" className="w-56 h-56 mx-auto" data-testid="upi-qr" />
          <p className="text-xs text-charcoal/50 mt-3 break-all max-w-xs mx-auto">Or pay to UPI link in your app</p>
        </div>
      )}

      {order && (
        <div className="mt-8 bg-white rounded-2xl shadow-soft p-6 text-left">
          <h2 className="font-playfair text-lg font-bold text-ocean mb-4">Order Status</h2>
          <OrderTimeline status={order.status} />
        </div>
      )}

      {order && (
        <div className="mt-8 bg-white rounded-2xl shadow-soft p-6 text-left">
          <h2 className="font-playfair text-lg font-bold text-ocean mb-4 flex items-center gap-2"><Package size={18} /> Order Details</h2>
          <div className="space-y-3">
            {order.items.map((i, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <img src={i.image} alt={i.name} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1"><p className="text-sm font-medium text-charcoal">{i.name}</p><p className="text-xs text-charcoal/50">{i.weight} × {i.quantity}</p></div>
                <span className="text-sm font-semibold">{inr(i.price * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-sand mt-4 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-charcoal/60">Subtotal</span><span>{inr(order.subtotal)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{inr(order.discount)}</span></div>}
            <div className="flex justify-between"><span className="text-charcoal/60">Shipping</span><span>{order.shipping === 0 ? "FREE" : inr(order.shipping)}</span></div>
            <div className="flex justify-between font-bold text-ocean text-base"><span>Total</span><span>{inr(order.total)}</span></div>
            <div className="flex justify-between pt-2"><span className="text-charcoal/60">Payment</span><span className="uppercase font-medium">{order.payment_method}</span></div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center mt-8">
        <Link to="/shop" className="px-7 py-3 rounded-full bg-ocean text-cream font-semibold hover:bg-ocean-light transition-colors">Continue Shopping</Link>
        <Link to="/account" className="px-7 py-3 rounded-full border border-ocean text-ocean font-semibold hover:bg-ocean hover:text-cream transition-colors">My Orders</Link>
      </div>
    </div>
  );
}

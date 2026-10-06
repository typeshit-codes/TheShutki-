import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { inr } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUSES = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];
const COLORS = { pending: "bg-amber-100 text-amber-700", confirmed: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700", packed: "bg-purple-100 text-purple-700", shipped: "bg-cyan-100 text-cyan-700", out_for_delivery: "bg-teal-100 text-teal-700", delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState(null);

  const load = () => api.get(`/admin/orders${filter !== "all" ? `?status=${filter}` : ""}`).then((r) => setOrders(r.data));
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/orders/${id}/status`, { status }); toast.success(`Order ${status}`); load();
    if (sel?.order_id === id) setSel({ ...sel, status });
  };
  const markPaid = async (id) => { await api.patch(`/admin/orders/${id}/payment`, { status: "paid" }); toast.success("Marked paid"); load(); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="font-playfair text-3xl font-bold text-ocean">Orders ({orders.length})</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44" data-testid="order-filter"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand/60 text-left"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-sand hover:bg-cream/50 cursor-pointer" onClick={() => setSel(o)} data-testid={`order-row-${o.order_id}`}>
                <td className="p-3 font-medium text-ocean">#{o.order_id}</td>
                <td className="p-3">{o.customer?.full_name}<br /><span className="text-xs text-charcoal/50">{o.customer?.phone}</span></td>
                <td className="p-3 font-semibold">{inr(o.total)}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${o.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{o.payment_method?.toUpperCase()} · {o.payment_status}</span></td>
                <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full capitalize ${COLORS[o.status] || "bg-sand"}`}>{o.status?.replace(/_/g, " ")}</span></td>
                <td className="p-3 text-charcoal/50 text-xs">{(o.created_at || "").slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-8 text-center text-charcoal/40">No orders yet.</p>}
      </div>

      <Dialog open={!!sel} onOpenChange={() => setSel(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {sel && (
            <>
              <DialogHeader><DialogTitle className="font-playfair text-ocean">Order #{sel.order_id}</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm">
                <div><p className="font-semibold text-ocean">Customer</p><p>{sel.customer?.full_name} · {sel.customer?.phone}</p><p className="text-charcoal/60">{sel.customer?.email}</p></div>
                <div><p className="font-semibold text-ocean">Shipping Address</p><p className="text-charcoal/70">{sel.shipping_address?.address}, {sel.shipping_address?.city}, {sel.shipping_address?.state} - {sel.shipping_address?.pincode}</p></div>
                <div><p className="font-semibold text-ocean mb-1">Items</p>{sel.items.map((i, idx) => <div key={idx} className="flex justify-between py-1"><span>{i.name} ({i.weight}) ×{i.quantity}</span><span>{inr(i.price * i.quantity)}</span></div>)}</div>
                <div className="border-t border-sand pt-2 space-y-1">
                  <div className="flex justify-between"><span className="text-charcoal/60">Subtotal</span><span>{inr(sel.subtotal)}</span></div>
                  {sel.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{inr(sel.discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-charcoal/60">Shipping</span><span>{inr(sel.shipping)}</span></div>
                  <div className="flex justify-between font-bold text-ocean"><span>Total</span><span>{inr(sel.total)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="font-semibold text-ocean mb-1">Update Status</p>
                    <Select value={sel.status} onValueChange={(v) => updateStatus(sel.order_id, v)}>
                      <SelectTrigger data-testid="update-order-status"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">{sel.payment_status !== "paid" && <button onClick={() => markPaid(sel.order_id)} className="w-full py-2 rounded-full bg-green-600 text-white text-sm font-semibold" data-testid="mark-paid">Mark as Paid</button>}</div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

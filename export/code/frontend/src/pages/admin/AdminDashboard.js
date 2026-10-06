import React, { useEffect, useState } from "react";
import { IndianRupee, ShoppingCart, Users, TrendingUp, Clock, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api, { inr } from "@/lib/api";

export default function AdminDashboard() {
  const [a, setA] = useState(null);
  const [inv, setInv] = useState([]);

  useEffect(() => {
    api.get("/admin/analytics").then((r) => setA(r.data)).catch(() => {});
    api.get("/admin/inventory").then((r) => setInv(r.data)).catch(() => {});
  }, []);

  if (!a) return <p className="text-ocean">Loading dashboard…</p>;
  const cards = [
    [IndianRupee, "Total Revenue", inr(a.revenue), "bg-sunset/10 text-sunset"],
    [ShoppingCart, "Total Orders", a.total_orders, "bg-ocean/10 text-ocean"],
    [TrendingUp, "Avg Order Value", inr(a.aov), "bg-green-100 text-green-700"],
    [Users, "Customers", a.customers, "bg-blue-100 text-blue-700"],
    [Clock, "Pending Orders", a.pending_orders, "bg-amber-100 text-amber-700"],
    [Package, "Paid Orders", a.paid_orders, "bg-purple-100 text-purple-700"],
  ];
  const low = inv.filter((i) => i.status !== "ok");

  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold text-ocean mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(([Icon, label, val, cls]) => (
          <div key={label} className="bg-white rounded-2xl shadow-soft p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-3 ${cls}`}><Icon size={20} /></div>
            <p className="text-2xl font-bold text-ocean">{val}</p>
            <p className="text-sm text-charcoal/50">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="font-playfair text-lg font-bold text-ocean mb-4">Sales (Last 7 days)</h2>
          {a.sales_series.length === 0 ? <p className="text-charcoal/40 text-sm py-10 text-center">No sales data yet</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={a.sales_series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => inr(v)} />
                <Bar dataKey="total" fill="#D96E3E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="font-playfair text-lg font-bold text-ocean mb-4">Bestselling Products</h2>
          {a.bestsellers.length === 0 ? <p className="text-charcoal/40 text-sm py-10 text-center">No orders yet</p> : (
            <div className="space-y-3">{a.bestsellers.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between">
                <span className="text-sm text-charcoal"><span className="text-sunset font-bold mr-2">{i + 1}</span>{b.name}</span>
                <span className="text-sm font-semibold text-ocean">{b.qty} sold</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft p-6 mt-6">
        <h2 className="font-playfair text-lg font-bold text-ocean mb-4">Inventory Alerts</h2>
        {low.length === 0 ? <p className="text-green-600 text-sm">All products are well stocked.</p> : (
          <div className="space-y-2">{low.map((i) => (
            <div key={i.id} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
              <div className="flex items-center gap-3"><img src={i.image} alt="" className="w-9 h-9 rounded-lg object-cover" /><span className="text-sm text-charcoal">{i.name}</span></div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${i.status === "out" ? "bg-destructive/10 text-destructive" : "bg-amber-100 text-amber-700"}`}>{i.status === "out" ? "Out of Stock" : `Low · ${i.stock}`}</span>
            </div>
          ))}</div>
        )}
      </div>
    </div>
  );
}

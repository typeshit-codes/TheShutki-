import React, { useEffect, useState } from "react";
import api, { inr } from "@/lib/api";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  useEffect(() => { api.get("/admin/customers").then((r) => setCustomers(r.data)); }, []);
  return (
    <div>
      <h1 className="font-playfair text-3xl font-bold text-ocean mb-6">Customers ({customers.length})</h1>
      <div className="bg-white rounded-2xl shadow-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand/60 text-left"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Orders</th><th className="p-3">Total Spent</th><th className="p-3">Joined</th></tr></thead>
          <tbody>{customers.map((c) => (
            <tr key={c.id} className="border-t border-sand" data-testid={`customer-${c.id}`}>
              <td className="p-3 font-medium text-ocean">{c.name}</td>
              <td className="p-3 text-charcoal/60">{c.email}</td>
              <td className="p-3">{c.phone || "—"}</td>
              <td className="p-3">{c.orders_count}</td>
              <td className="p-3 font-semibold">{inr(c.total_spent)}</td>
              <td className="p-3 text-charcoal/50 text-xs">{(c.created_at || "").slice(0, 10)}</td>
            </tr>
          ))}</tbody>
        </table>
        {customers.length === 0 && <p className="p-8 text-center text-charcoal/40">No customers yet.</p>}
      </div>
    </div>
  );
}

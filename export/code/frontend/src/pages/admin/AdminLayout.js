import React, { useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Tags, Ticket, Users, Star, ChefHat, Settings, Menu, X, Home } from "lucide-react";

const LINKS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/recipes", label: "Recipes", icon: ChefHat },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="flex flex-col gap-1 p-4">
      {LINKS.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} data-testid={`admin-nav-${l.label.toLowerCase()}`}
          className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-sunset text-white" : "text-cream/70 hover:bg-cream/10"}`}>
          <l.icon size={18} /> {l.label}
        </NavLink>
      ))}
      <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-cream/70 hover:bg-cream/10 mt-4"><Home size={18} /> Back to Store</Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-cream flex">
      <aside className="hidden lg:flex w-64 bg-ocean-dark flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-6"><img src="/logo.png" alt="TheShutki" className="h-10 bg-cream rounded-lg p-1" /><p className="text-cream/50 text-xs mt-2 uppercase tracking-widest">Admin Panel</p></div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-ocean-dark"><div className="p-6 flex justify-between"><img src="/logo.png" className="h-9 bg-cream rounded p-1" alt="" /><button onClick={() => setOpen(false)}><X className="text-cream" /></button></div>{nav}</div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="lg:hidden bg-ocean-dark text-cream p-4 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setOpen(true)} data-testid="admin-menu"><Menu /></button>
          <span className="font-playfair font-bold">TheShutki Admin</span>
        </header>
        <div className="p-5 md:p-8"><Outlet /></div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, LogOut, Package, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import api, { inr, formatApiError } from "@/lib/api";
import { useStore } from "@/context/store";

export default function Account() {
  const { user, login, register, logout, authReady } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user) api.get("/orders/me").then((r) => setOrders(r.data)).catch(() => {});
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
      toast.success("Welcome to TheShutki!");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally { setLoading(false); }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-sand outline-none focus:border-sunset bg-white";

  if (!authReady) return <div className="min-h-[50vh] flex items-center justify-center text-ocean">Loading…</div>;

  if (user) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 md:py-14">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-playfair text-3xl font-bold text-ocean">Hello, {user.name}</h1>
            <p className="text-charcoal/60">{user.email}</p>
          </div>
          <div className="flex gap-3">
            {user.role === "admin" && (
              <Link to="/admin" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-ocean text-cream text-sm font-semibold" data-testid="go-admin"><LayoutDashboard size={16} /> Admin Panel</Link>
            )}
            <button onClick={() => { logout(); toast("Logged out"); }} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-sand text-charcoal/70 text-sm font-medium" data-testid="logout-btn"><LogOut size={16} /> Logout</button>
          </div>
        </div>
        <h2 className="font-playfair text-xl font-bold text-ocean mb-4 flex items-center gap-2"><Package size={20} /> My Orders</h2>
        {orders.length === 0 ? (
          <p className="text-charcoal/50 py-8">You haven't placed any orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl shadow-soft p-5" data-testid={`order-${o.order_id}`}>
                <div className="flex justify-between flex-wrap gap-2">
                  <div><p className="font-semibold text-ocean">#{o.order_id}</p><p className="text-xs text-charcoal/50">{(o.created_at || "").slice(0, 10)}</p></div>
                  <div className="text-right"><p className="font-bold text-ocean">{inr(o.total)}</p><span className="text-xs px-2 py-0.5 rounded-full bg-sunset/10 text-sunset capitalize">{o.status}</span></div>
                </div>
                <p className="text-sm text-charcoal/60 mt-2">{o.items.map((i) => `${i.name} (${i.weight}) ×${i.quantity}`).join(", ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-14 md:py-20">
      <div className="bg-white rounded-3xl shadow-elevated p-8">
        <h1 className="font-playfair text-3xl font-bold text-ocean text-center">{mode === "login" ? "Welcome Back" : "Create Account"}</h1>
        <p className="text-charcoal/60 text-center mt-1 mb-6">{mode === "login" ? "Login to your account" : "Join TheShutki family"}</p>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <input className={inputCls} placeholder="Full Name" value={form.name} onChange={set("name")} data-testid="auth-name" required />}
          <input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={set("email")} data-testid="auth-email" required />
          {mode === "register" && <input className={inputCls} placeholder="Phone (optional)" value={form.phone} onChange={set("phone")} data-testid="auth-phone" />}
          <input className={inputCls} type="password" placeholder="Password" value={form.password} onChange={set("password")} data-testid="auth-password" required />
          <button type="submit" disabled={loading} data-testid="auth-submit"
            className="w-full py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : (mode === "login" ? "Login" : "Create Account")}
          </button>
        </form>
        <p className="text-center text-sm text-charcoal/60 mt-5">
          {mode === "login" ? "New to TheShutki?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-sunset font-semibold" data-testid="auth-switch">
            {mode === "login" ? "Create an account" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

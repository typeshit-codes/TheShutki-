import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, LogOut, Package, LayoutDashboard, Phone, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import api, { inr, formatApiError } from "@/lib/api";
import { useStore } from "@/context/store";
import OrderTimeline from "@/components/OrderTimeline";
import { initFirebase, getFbAuth, RecaptchaVerifier, signInWithPhoneNumber } from "@/lib/firebase";
import { GoogleLogin } from "@react-oauth/google";

function GoogleButton() {
  const { loginWithGoogle, authConfig } = useStore();
  const navigate = useNavigate();
  if (!authConfig?.google_enabled) return null;
  return (
    <div className="flex justify-center my-4" data-testid="google-signin">
      <GoogleLogin
        onSuccess={async (resp) => {
          try { const u = await loginWithGoogle(resp.credential); toast.success("Welcome!"); if (u?.role === "admin") navigate("/admin"); }
          catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
        }}
        onError={() => toast.error("Google sign-in failed")}
        text="continue_with" width="320"
      />
    </div>
  );
}

function PhoneOtp() {
  const { authConfig, loginWithFirebase } = useStore();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (authConfig?.firebase_enabled) initFirebase(authConfig.firebase); }, [authConfig]);
  if (!authConfig?.firebase_enabled) return null;

  const sendOtp = async () => {
    const num = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
    setLoading(true);
    try {
      const auth = getFbAuth();
      if (!window._recaptcha) window._recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      const res = await signInWithPhoneNumber(auth, num, window._recaptcha);
      setConfirmation(res); toast.success("OTP sent to " + num);
    } catch (e) { toast.error(e.message || "Failed to send OTP"); } finally { setLoading(false); }
  };
  const verify = async () => {
    setLoading(true);
    try {
      const result = await confirmation.confirm(otp);
      const idToken = await result.user.getIdToken();
      const u = await loginWithFirebase(idToken);
      toast.success("Welcome!"); if (u?.role === "admin") navigate("/admin");
    } catch (e) { toast.error("Invalid OTP"); } finally { setLoading(false); }
  };
  const inp = "w-full px-4 py-3 rounded-xl border border-sand outline-none focus:border-sunset bg-white";
  return (
    <div className="mt-4 p-4 rounded-xl bg-sand/50">
      <p className="text-sm font-semibold text-ocean mb-2 flex items-center gap-2"><Phone size={15} /> Login with Phone OTP</p>
      {!confirmation ? (
        <div className="flex gap-2">
          <input className={inp} placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="otp-phone" />
          <button onClick={sendOtp} disabled={loading} className="px-5 rounded-xl bg-ocean text-cream text-sm font-semibold shrink-0">{loading ? "…" : "Send OTP"}</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input className={inp} placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} data-testid="otp-code" />
          <button onClick={verify} disabled={loading} className="px-5 rounded-xl bg-sunset text-white text-sm font-semibold shrink-0">{loading ? "…" : "Verify"}</button>
        </div>
      )}
      <div id="recaptcha-container" />
    </div>
  );
}

export default function Account() {
  const { user, login, register, logout, authReady } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [cap, setCap] = useState({ a: 0, b: 0 });
  const [capAns, setCapAns] = useState("");

  const newCaptcha = () => setCap({ a: Math.floor(Math.random() * 9) + 1, b: Math.floor(Math.random() * 9) + 1 });
  useEffect(() => { newCaptcha(); }, [mode]);

  useEffect(() => {
    if (user) api.get("/orders/me").then((r) => setOrders(r.data)).catch(() => {});
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (mode === "register" && Number(capAns) !== cap.a + cap.b) { toast.error("Incorrect captcha answer"); newCaptcha(); setCapAns(""); return; }
    setLoading(true);
    try {
      const u = mode === "login" ? await login(form.email, form.password) : await register(form);
      toast.success("Welcome to TheShutki!");
      if (u?.role === "admin") navigate("/admin");
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
                <button onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="w-full flex justify-between flex-wrap gap-2 text-left" data-testid={`track-${o.order_id}`}>
                  <div><p className="font-semibold text-ocean">#{o.order_id}</p><p className="text-xs text-charcoal/50">{(o.created_at || "").slice(0, 10)}</p></div>
                  <div className="text-right flex items-center gap-3"><div><p className="font-bold text-ocean">{inr(o.total)}</p><span className="text-xs px-2 py-0.5 rounded-full bg-sunset/10 text-sunset capitalize">{o.status?.replace(/_/g, " ")}</span></div><ChevronDown size={18} className={`text-ocean transition-transform ${expanded === o.id ? "rotate-180" : ""}`} /></div>
                </button>
                <p className="text-sm text-charcoal/60 mt-2">{o.items.map((i) => `${i.name} (${i.weight}) ×${i.quantity}`).join(", ")}</p>
                {expanded === o.id && (
                  <div className="mt-4 border-t border-sand pt-4">
                    <p className="font-semibold text-ocean text-sm mb-2">Track Order</p>
                    <OrderTimeline status={o.status} />
                  </div>
                )}
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
          {mode === "register" && (
            <div className="flex items-center gap-3">
              <span className="px-4 py-3 rounded-xl bg-sand font-semibold text-ocean text-sm" data-testid="captcha-question">{cap.a} + {cap.b} = ?</span>
              <input className={inputCls} placeholder="Answer" value={capAns} onChange={(e) => setCapAns(e.target.value)} data-testid="captcha-answer" required />
            </div>
          )}
          <button type="submit" disabled={loading} data-testid="auth-submit"
            className="w-full py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : (mode === "login" ? "Login" : "Create Account")}
          </button>
        </form>

        <GoogleButton />
        <PhoneOtp />

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

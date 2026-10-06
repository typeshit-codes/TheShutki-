import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const read = (k, def) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; }
};

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [settings, setSettings] = useState({});
  const [authConfig, setAuthConfig] = useState({ google_enabled: false, firebase_enabled: false });
  const [cart, setCart] = useState(() => read("ts_cart", []));
  const [wishlist, setWishlist] = useState(() => read("ts_wishlist", []));

  useEffect(() => { localStorage.setItem("ts_cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("ts_wishlist", JSON.stringify(wishlist)); }, [wishlist]);

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data || {})).catch(() => {});
    api.get("/auth/config").then((r) => setAuthConfig(r.data || {})).catch(() => {});
    const token = localStorage.getItem("ts_token");
    if (token) {
      api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
        localStorage.removeItem("ts_token");
      }).finally(() => setAuthReady(true));
    } else {
      setAuthReady(true);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("ts_token", data.token);
    setUser(data);
    return data;
  };
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("ts_token", data.token);
    setUser(data);
    return data;
  };
  const logout = async () => {
    localStorage.removeItem("ts_token");
    setUser(null);
    api.post("/auth/logout").catch(() => {});
  };

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    localStorage.setItem("ts_token", data.token);
    setUser(data);
    return data;
  };
  const loginWithFirebase = async (id_token) => {
    const { data } = await api.post("/auth/firebase", { id_token });
    localStorage.setItem("ts_token", data.token);
    setUser(data);
    return data;
  };

  const refreshSettings = useCallback(() => {
    api.get("/settings").then((r) => setSettings(r.data || {})).catch(() => {});
  }, []);

  // ---- cart
  const cartKey = (p, weight) => `${p.id}__${weight}`;
  const addToCart = (product, variant, qty = 1) => {
    const key = cartKey(product, variant.weight);
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, {
        key, product_id: product.id, name: product.name, slug: product.slug,
        weight: variant.weight, price: variant.price, mrp: variant.mrp,
        image: (product.images || [])[0], quantity: qty,
        max_stock: variant.stock,
      }];
    });
    toast.success(`${product.name} (${variant.weight}) added to cart`);
  };
  const updateQty = (key, qty) => {
    if (qty <= 0) return removeFromCart(key);
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i)));
  };
  const removeFromCart = (key) => setCart((prev) => prev.filter((i) => i.key !== key));
  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // ---- wishlist
  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        toast("Removed from wishlist");
        return prev.filter((p) => p.id !== product.id);
      }
      toast.success("Added to wishlist");
      return [...prev, { id: product.id, name: product.name, slug: product.slug,
        image: (product.images || [])[0], price: (product.variants || [])[0]?.price,
        mrp: (product.variants || [])[0]?.mrp }];
    });
  };
  const inWishlist = (id) => wishlist.some((p) => p.id === id);

  const value = {
    user, authReady, login, register, logout, loginWithGoogle, loginWithFirebase, authConfig,
    settings, refreshSettings, setSettings,
    cart, addToCart, updateQty, removeFromCart, clearCart, cartCount, cartSubtotal,
    wishlist, toggleWishlist, inWishlist, formatApiError,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

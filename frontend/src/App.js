import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider, useStore } from "@/context/store";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import Wishlist from "@/pages/Wishlist";
import Account from "@/pages/Account";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Recipes from "@/pages/Recipes";
import RecipeDetail from "@/pages/RecipeDetail";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminCoupons from "@/pages/admin/AdminCoupons";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminRecipes from "@/pages/admin/AdminRecipes";
import AdminSettings from "@/pages/admin/AdminSettings";

function AdminGuard({ children }) {
  const { user, authReady } = useStore();
  if (!authReady) return <div className="min-h-screen flex items-center justify-center text-ocean">Loading…</div>;
  if (!user || user.role !== "admin") return <Navigate to="/account" replace />;
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/:slug" element={<RecipeDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/account" element={<Account />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="recipes" element={<AdminRecipes />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function AppInner() {
  const { authConfig } = useStore();
  const clientId = authConfig?.google_client_id;
  if (clientId) {
    return <GoogleOAuthProvider clientId={clientId}><AppRoutes /></GoogleOAuthProvider>;
  }
  return <AppRoutes />;
}

function App() {
  return (
    <StoreProvider>
      <AppInner />
      <Toaster position="top-center" richColors />
    </StoreProvider>
  );
}

export default App;

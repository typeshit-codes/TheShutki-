import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Store, Search, Heart, ShoppingBag } from "lucide-react";
import { useStore } from "@/context/store";

export default function MobileBottomNav({ onSearch }) {
  const { cartCount, wishlist } = useStore();
  const { pathname } = useLocation();
  const items = [
    { label: "Home", icon: Home, to: "/" },
    { label: "Shop", icon: Store, to: "/shop" },
    { label: "Search", icon: Search, action: true },
    { label: "Wishlist", icon: Heart, to: "/wishlist", badge: wishlist.length },
    { label: "Cart", icon: ShoppingBag, to: "/cart", badge: cartCount },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-sand lg:hidden shadow-[0_-10px_24px_rgba(0,0,0,0.04)]" data-testid="mobile-bottom-nav">
      <div className="flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => {
          const active = it.to && pathname === it.to;
          const Inner = (
            <>
              <div className="relative">
                <it.icon size={21} className={active ? "text-sunset" : "text-ocean/70"} />
                {it.badge > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-sunset text-white text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center">{it.badge}</span>
                )}
              </div>
              <span className={`text-[10px] mt-1 ${active ? "text-sunset font-semibold" : "text-ocean/60"}`}>{it.label}</span>
            </>
          );
          return it.action ? (
            <button key={it.label} onClick={onSearch} className="flex flex-col items-center flex-1" data-testid="bottom-nav-search">{Inner}</button>
          ) : (
            <Link key={it.label} to={it.to} className="flex flex-col items-center flex-1" data-testid={`bottom-nav-${it.label.toLowerCase()}`}>{Inner}</Link>
          );
        })}
      </div>
    </nav>
  );
}

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Heart, ShoppingBag, Menu, X } from "lucide-react";
import { useStore } from "@/context/store";
import SearchModal from "@/components/SearchModal";

const NAV = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Dry Fish", to: "/shop?category=Dry Fish" },
  { label: "Combos", to: "/shop?combo=1" },
  { label: "Ready to Cook", to: "/shop?category=Ready to Cook" },
  { label: "Pickles", to: "/shop?category=Fish Pickles" },
  { label: "About Us", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function Header() {
  const { cartCount, wishlist, settings, user } = useStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="bg-ocean text-cream text-[11px] md:text-sm py-2 text-center font-outfit tracking-wide px-4" data-testid="announcement-bar">
        {settings.announcement || "FREE SHIPPING ON PREPAID ORDERS • PAN-INDIA DELIVERY"}
      </div>

      <header className={`sticky top-0 z-50 glass transition-shadow duration-300 ${scrolled ? "shadow-header" : ""}`} data-testid="main-header">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between h-16 md:h-20 gap-4">
          <button className="lg:hidden text-ocean" onClick={() => setOpen(true)} data-testid="mobile-menu-button" aria-label="Menu">
            <Menu size={26} />
          </button>

          <Link to="/" className="flex items-center shrink-0" data-testid="logo-link">
            <img src="/logo.png" alt="TheShutki" className="h-9 md:h-12 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} className="text-[13px] font-medium text-charcoal/80 hover:text-sunset transition-colors uppercase tracking-wide"
                data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 md:gap-5 text-ocean">
            <button onClick={() => setSearch(true)} className="hover:text-sunset transition-colors" data-testid="search-button" aria-label="Search">
              <Search size={21} />
            </button>
            <Link to={user ? "/account" : "/account"} className="hover:text-sunset transition-colors hidden sm:block" data-testid="account-button" aria-label="Account">
              <User size={21} />
            </Link>
            <Link to="/wishlist" className="hover:text-sunset transition-colors relative hidden sm:block" data-testid="wishlist-button" aria-label="Wishlist">
              <Heart size={21} />
              {wishlist.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-sunset text-white text-[10px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center">{wishlist.length}</span>
              )}
            </Link>
            <Link to="/cart" className="hover:text-sunset transition-colors relative" data-testid="cart-button" aria-label="Cart">
              <ShoppingBag size={21} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-sunset text-white text-[10px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center" data-testid="cart-count">{cartCount}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" data-testid="mobile-drawer">
          <div className="absolute inset-0 bg-ocean-dark/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[82%] max-w-sm bg-cream p-6 animate-fade-up overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <img src="/logo.png" alt="TheShutki" className="h-10" />
              <button onClick={() => setOpen(false)} data-testid="close-drawer"><X size={26} className="text-ocean" /></button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <Link key={n.label} to={n.to} onClick={() => setOpen(false)}
                  className="py-3 border-b border-sand text-charcoal font-medium text-lg font-playfair">
                  {n.label}
                </Link>
              ))}
              <Link to="/account" onClick={() => setOpen(false)} className="py-3 text-ocean font-medium mt-2">
                {user ? "My Account" : "Login / Register"}
              </Link>
              {user?.role === "admin" && (
                <Link to="/admin" onClick={() => setOpen(false)} className="py-3 text-sunset font-semibold">Admin Panel</Link>
              )}
            </nav>
          </div>
        </div>
      )}

      {search && <SearchModal onClose={() => setSearch(false)} />}
    </>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Facebook, Youtube, Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { useStore } from "@/context/store";

export default function Footer() {
  const { settings } = useStore();
  return (
    <footer className="bg-ocean-dark text-cream/80 mt-20" data-testid="footer">
      <div className="max-w-[1440px] mx-auto px-5 md:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <img src="/logo.png" alt="TheShutki" className="h-12 mb-4 bg-cream rounded-lg p-1.5 w-fit" />
          <p className="text-sm leading-relaxed text-cream/60 max-w-xs">Authentic coastal flavours delivered to your doorstep. Premium sun-dried fish, hygienically packed.</p>
          <div className="flex gap-3 mt-5">
            {[["instagram", Instagram], ["facebook", Facebook], ["youtube", Youtube]].map(([k, Icon]) => (
              <a key={k} href={settings[k] || "#"} target="_blank" rel="noreferrer"
                className="h-9 w-9 rounded-full bg-cream/10 flex items-center justify-center hover:bg-sunset transition-colors" aria-label={k}>
                <Icon size={17} />
              </a>
            ))}
            <a href={`https://wa.me/${settings.whatsapp_number || ""}`} target="_blank" rel="noreferrer"
              className="h-9 w-9 rounded-full bg-cream/10 flex items-center justify-center hover:bg-green-600 transition-colors" aria-label="whatsapp">
              <MessageCircle size={17} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-playfair text-cream text-lg mb-4">Shop</h4>
          <ul className="space-y-2.5 text-sm">
            {["Dry Fish", "Prawns & Shrimp", "Premium Fish", "Boneless Shutki", "Combo Packs", "Fish Pickles"].map((c) => (
              <li key={c}><Link to={`/shop?category=${encodeURIComponent(c)}`} className="hover:text-sunset transition-colors">{c}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-playfair text-cream text-lg mb-4">Customer Care</h4>
          <ul className="space-y-2.5 text-sm">
            {[["Contact Us", "/contact"], ["Shipping Policy", "/contact"], ["Return Policy", "/contact"],
              ["Privacy Policy", "/contact"], ["Terms & Conditions", "/contact"], ["Track Order", "/account"]].map(([t, l]) => (
              <li key={t}><Link to={l} className="hover:text-sunset transition-colors">{t}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-playfair text-cream text-lg mb-4">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5"><Phone size={16} className="text-sunset shrink-0 mt-0.5" /><span>{settings.phone || "+91 98765 43210"}</span></li>
            <li className="flex gap-2.5"><MessageCircle size={16} className="text-sunset shrink-0 mt-0.5" /><span>WhatsApp Support</span></li>
            <li className="flex gap-2.5"><Mail size={16} className="text-sunset shrink-0 mt-0.5" /><span>{settings.email || "care@theshutki.com"}</span></li>
            <li className="flex gap-2.5"><MapPin size={16} className="text-sunset shrink-0 mt-0.5" /><span>{settings.address}</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/50 px-4">
        © 2026 TheShutki.com. All Rights Reserved. · Authentic Shutki. Coastal Taste. Delivered Fresh.
      </div>
    </footer>
  );
}

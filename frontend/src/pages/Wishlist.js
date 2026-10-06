import React from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { useStore } from "@/context/store";
import { inr } from "@/lib/api";

export default function Wishlist() {
  const { wishlist, toggleWishlist } = useStore();

  if (wishlist.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center" data-testid="empty-wishlist">
        <Heart size={64} className="mx-auto text-ocean/20 mb-5" />
        <h1 className="font-playfair text-3xl font-bold text-ocean">Your wishlist is empty</h1>
        <p className="text-charcoal/60 mt-2">Save your favourite Shutki for later.</p>
        <Link to="/shop" className="inline-block mt-6 px-8 py-3 rounded-full bg-sunset text-white font-semibold">Explore Products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <h1 className="font-playfair text-3xl md:text-4xl font-bold text-ocean mb-8">My Wishlist</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {wishlist.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl shadow-soft overflow-hidden group" data-testid={`wishlist-item-${p.slug}`}>
            <Link to={`/products/${p.slug}`} className="block overflow-hidden">
              <img src={p.image} alt={p.name} className="aspect-square w-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </Link>
            <div className="p-4">
              <Link to={`/products/${p.slug}`} className="font-playfair font-semibold text-ocean hover:text-sunset transition-colors line-clamp-1">{p.name}</Link>
              <p className="font-bold text-ocean mt-1">{inr(p.price)}</p>
              <button onClick={() => toggleWishlist(p)} className="mt-3 w-full py-2 rounded-full border border-sand text-sm text-charcoal/70 hover:border-destructive hover:text-destructive transition-colors flex items-center justify-center gap-1.5">
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

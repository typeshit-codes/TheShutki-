import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, Heart } from "lucide-react";
import { useStore } from "@/context/store";
import { inr } from "@/lib/api";

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, inWishlist } = useStore();
  const navigate = useNavigate();
  const variants = product.variants || [];
  const [variant, setVariant] = useState(variants[0] || { weight: "-", price: 0, mrp: 0, stock: 0 });

  const discount = variant.mrp > variant.price ? Math.round((1 - variant.price / variant.mrp) * 100) : 0;
  const inStock = (variant.stock ?? 0) > 0;
  const liked = inWishlist(product.id);

  const open = () => navigate(`/products/${product.slug}`);

  const buyNow = (e) => {
    e.stopPropagation();
    addToCart(product, variant, 1);
    navigate("/cart");
  };

  return (
    <div className="group bg-white rounded-2xl shadow-soft hover:shadow-elevated transition-shadow duration-300 overflow-hidden flex flex-col" data-testid={`product-card-${product.slug}`}>
      <div className="relative overflow-hidden cursor-pointer" onClick={open}>
        <img src={(product.images || [])[0]} alt={product.name} loading="lazy"
          className="aspect-square w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {product.badge && (
          <span className="absolute top-3 left-3 bg-ocean text-cream text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-md uppercase">{product.badge}</span>
        )}
        {discount > 0 && (
          <span className="absolute top-3 right-3 bg-sunset text-white text-[11px] font-bold px-2 py-1 rounded-md">{discount}% OFF</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
          data-testid={`wishlist-toggle-${product.slug}`}
          className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-soft hover:scale-110 transition-transform">
          <Heart size={17} className={liked ? "fill-sunset text-sunset" : "text-ocean"} />
        </button>
      </div>

      <div className="p-4 md:p-5 flex flex-col flex-1">
        <div className="flex items-center gap-1 text-sunset mb-1">
          <Star size={13} className="fill-sunset" />
          <span className="text-xs font-semibold text-charcoal">{product.rating}</span>
          <span className="text-xs text-muted-foreground">({product.reviews_count})</span>
          <span className={`ml-auto text-[11px] font-medium ${inStock ? "text-green-600" : "text-destructive"}`}>
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>
        <h3 className="font-playfair text-base md:text-lg font-semibold text-charcoal leading-snug cursor-pointer hover:text-ocean transition-colors" onClick={open}>
          {product.name}
        </h3>
        {product.bengali_name && <p className="text-xs text-muted-foreground mb-1">{product.bengali_name}</p>}
        <p className="text-sm text-charcoal/60 line-clamp-2 mb-3">{product.description}</p>

        {variants.length > 1 && (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {variants.map((v) => (
              <button key={v.weight} onClick={() => setVariant(v)}
                data-testid={`variant-${product.slug}-${v.weight}`}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${variant.weight === v.weight ? "border-sunset bg-sunset/10 text-sunset" : "border-sand text-charcoal/70 hover:border-ocean/40"}`}>
                {v.weight}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-baseline gap-2 mb-3 mt-auto">
          <span className="font-outfit text-xl font-bold text-ocean">{inr(variant.price)}</span>
          {variant.mrp > variant.price && <span className="text-sm text-muted-foreground line-through">{inr(variant.mrp)}</span>}
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={(e) => { e.stopPropagation(); addToCart(product, variant, 1); }}
            disabled={!inStock} data-testid={`add-to-cart-${product.slug}`}
            className="w-full py-2.5 rounded-full text-sm font-semibold bg-cream text-ocean hover:bg-ocean hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            Add to Cart
          </button>
          <button onClick={buyNow} disabled={!inStock} data-testid={`buy-now-${product.slug}`}
            className="w-full py-2.5 rounded-full text-sm font-semibold bg-sunset text-white hover:bg-sunset-hover transition-colors disabled:opacity-50">
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Star, Heart, Minus, Plus, Truck, ShieldCheck, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import api, { inr } from "@/lib/api";
import { useStore } from "@/context/store";
import ProductCard from "@/components/ProductCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, inWishlist } = useStore();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [variant, setVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [pincode, setPincode] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/products/${slug}`).then((r) => {
      setProduct(r.data);
      setVariant((r.data.variants || [])[0]);
      setActiveImg(0); setQty(1);
      document.title = `${r.data.name} — TheShutki.com`;
      api.get(`/products?category=${encodeURIComponent(r.data.category)}`).then((rr) =>
        setRelated(rr.data.filter((p) => p.slug !== r.data.slug).slice(0, 4)));
      api.get(`/reviews?product_id=${r.data.id}`).then((rr) => setReviews(rr.data)).catch(() => {});
    }).catch(() => navigate("/shop"));
  }, [slug, navigate]);

  if (!product) return <div className="min-h-[60vh] flex items-center justify-center text-ocean">Loading…</div>;
  const v = variant || {};
  const discount = v.mrp > v.price ? Math.round((1 - v.price / v.mrp) * 100) : 0;
  const inStock = (v.stock ?? 0) > 0;
  const images = product.images?.length ? product.images : [""];

  const checkPin = () => {
    if (/^\d{6}$/.test(pincode)) setPinMsg(`✓ Delivery available to ${pincode}. Estimated 3–6 days.`);
    else setPinMsg("Please enter a valid 6-digit pincode.");
  };

  return (
    <div className="max-w-[1440px] mx-auto px-5 md:px-8 py-8 md:py-12">
      <nav className="flex items-center gap-1.5 text-xs text-charcoal/50 mb-6 flex-wrap">
        <Link to="/" className="hover:text-sunset">Home</Link><ChevronRight size={12} />
        <Link to="/shop" className="hover:text-sunset">Shop</Link><ChevronRight size={12} />
        <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-sunset">{product.category}</Link><ChevronRight size={12} />
        <span className="text-ocean">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
        {/* Gallery */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-white shadow-soft group">
            <img src={images[activeImg]} alt={product.name} className="w-full aspect-square object-cover hover:scale-110 transition-transform duration-500 cursor-zoom-in" data-testid="product-main-image" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3 mt-4">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`h-20 w-20 rounded-xl overflow-hidden border-2 ${activeImg === i ? "border-sunset" : "border-transparent"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.badge && <span className="inline-block bg-ocean text-cream text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-md uppercase mb-3">{product.badge}</span>}
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-ocean leading-tight">{product.name}</h1>
          {product.bengali_name && <p className="text-charcoal/50 mt-1">{product.bengali_name}</p>}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className={i < Math.round(product.rating) ? "fill-sunset text-sunset" : "text-sand"} />)}</div>
            <span className="text-sm font-semibold text-charcoal">{product.rating}</span>
            <span className="text-sm text-charcoal/50">({product.reviews_count} reviews)</span>
          </div>

          <div className="flex items-baseline gap-3 mt-5">
            <span className="font-bold text-3xl text-ocean">{inr(v.price)}</span>
            {v.mrp > v.price && <span className="text-lg text-muted-foreground line-through">{inr(v.mrp)}</span>}
            {discount > 0 && <span className="text-sm font-bold text-sunset bg-sunset/10 px-2 py-0.5 rounded">{discount}% OFF</span>}
          </div>
          <p className="text-xs text-charcoal/50 mt-1">Inclusive of all taxes</p>

          <p className="text-charcoal/70 mt-5 leading-relaxed">{product.description}</p>

          {/* Weight */}
          <div className="mt-6">
            <p className="text-sm font-semibold text-ocean mb-2">Weight</p>
            <div className="flex gap-2 flex-wrap">
              {(product.variants || []).map((vv) => (
                <button key={vv.weight} onClick={() => setVariant(vv)} data-testid={`pdp-variant-${vv.weight}`}
                  className={`px-4 py-2 rounded-xl border-2 font-medium text-sm transition-colors ${v.weight === vv.weight ? "border-sunset bg-sunset/10 text-sunset" : "border-sand text-charcoal/70 hover:border-ocean/40"}`}>
                  {vv.weight} · {inr(vv.price)}
                </button>
              ))}
            </div>
          </div>

          {/* Qty */}
          <div className="mt-6 flex items-center gap-4">
            <p className="text-sm font-semibold text-ocean">Quantity</p>
            <div className="flex items-center border border-sand rounded-full">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-10 w-10 flex items-center justify-center text-ocean" data-testid="qty-minus"><Minus size={16} /></button>
              <span className="w-10 text-center font-semibold" data-testid="qty-value">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="h-10 w-10 flex items-center justify-center text-ocean" data-testid="qty-plus"><Plus size={16} /></button>
            </div>
            <span className={`text-sm font-medium ${inStock ? "text-green-600" : "text-destructive"}`}>{inStock ? `${v.stock} in stock` : "Out of stock"}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <button disabled={!inStock} onClick={() => addToCart(product, v, qty)} data-testid="pdp-add-to-cart"
              className="flex-1 py-3.5 rounded-full bg-cream border border-ocean text-ocean font-semibold hover:bg-ocean hover:text-cream transition-colors disabled:opacity-50">Add to Cart</button>
            <button disabled={!inStock} onClick={() => { addToCart(product, v, qty); navigate("/cart"); }} data-testid="pdp-buy-now"
              className="flex-1 py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors disabled:opacity-50">Buy Now</button>
            <button onClick={() => toggleWishlist(product)} data-testid="pdp-wishlist"
              className="h-13 w-13 rounded-full border border-sand flex items-center justify-center shrink-0" style={{ height: 52, width: 52 }}>
              <Heart size={20} className={inWishlist(product.id) ? "fill-sunset text-sunset" : "text-ocean"} />
            </button>
          </div>

          {/* Pincode */}
          <div className="mt-7 p-4 rounded-2xl bg-sand/50">
            <p className="text-sm font-semibold text-ocean mb-2 flex items-center gap-2"><Truck size={16} /> Check Delivery</p>
            <div className="flex gap-2">
              <input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Enter pincode" maxLength={6}
                data-testid="pincode-input" className="flex-1 px-4 py-2.5 rounded-full border border-sand outline-none focus:border-sunset bg-white" />
              <button onClick={checkPin} data-testid="pincode-check" className="px-5 py-2.5 rounded-full bg-ocean text-cream text-sm font-semibold">Check</button>
            </div>
            {pinMsg && <p className="text-sm mt-2 text-charcoal/70" data-testid="pincode-msg">{pinMsg}</p>}
          </div>

          <div className="flex gap-6 mt-5 text-sm text-charcoal/60">
            <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-sunset" /> Hygienically Packed</span>
            <span className="flex items-center gap-1.5"><Check size={16} className="text-sunset" /> Quality Selected</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-14">
        <Tabs defaultValue="desc">
          <TabsList className="flex-wrap h-auto bg-sand/60 rounded-full p-1">
            {[["desc", "Description"], ["details", "Product Details"], ["storage", "Storage"], ["prep", "Preparation"], ["shipping", "Shipping"], ["reviews", `Reviews (${reviews.length})`]].map(([v2, l]) => (
              <TabsTrigger key={v2} value={v2} className="rounded-full data-[state=active]:bg-ocean data-[state=active]:text-cream" data-testid={`tab-${v2}`}>{l}</TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-6 max-w-3xl">
            <TabsContent value="desc"><p className="text-charcoal/70 leading-relaxed">{product.long_description}</p></TabsContent>
            <TabsContent value="details"><p className="text-charcoal/70 leading-relaxed"><strong>Ingredients:</strong> {product.ingredients}<br /><strong>Fish Type:</strong> {product.fish_type}<br /><strong>Salt Level:</strong> {product.salt_level}</p></TabsContent>
            <TabsContent value="storage"><p className="text-charcoal/70 leading-relaxed">{product.storage_instructions}</p></TabsContent>
            <TabsContent value="prep"><p className="text-charcoal/70 leading-relaxed">{product.preparation_instructions}</p></TabsContent>
            <TabsContent value="shipping"><p className="text-charcoal/70 leading-relaxed">We ship pan-India. Prepaid orders ship free above the threshold shown at checkout. Orders are typically delivered in 3–6 business days.</p></TabsContent>
            <TabsContent value="reviews">
              {reviews.length === 0 ? <p className="text-charcoal/50">No reviews yet for this product.</p> : (
                <div className="space-y-4">{reviews.map((r) => (
                  <div key={r.id} className="border-b border-sand pb-4">
                    <div className="flex gap-0.5 mb-1">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={14} className="fill-sunset text-sunset" />)}</div>
                    <p className="text-charcoal/80">{r.text}</p>
                    <p className="text-sm font-semibold text-ocean mt-1">{r.name} {r.verified && <span className="text-green-600 text-xs">✓ Verified</span>}</p>
                  </div>
                ))}</div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Frequently bought / related */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="font-playfair text-2xl md:text-3xl font-bold text-ocean mb-6">Frequently Bought Together</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </div>
      )}
    </div>
  );
}

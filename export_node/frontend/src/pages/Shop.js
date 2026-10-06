import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const SORTS = [["featured", "Featured"], ["bestselling", "Best Selling"], ["price_asc", "Price: Low to High"], ["price_desc", "Price: High to Low"], ["new", "New Arrivals"]];
const FISH = ["All", "Anchovies", "Prawns", "Sardines", "Bombay Duck", "King Fish", "Ribbon Fish", "Squid", "Shark", "Boneless", "Combo"];
const SALT = ["All", "Regular", "Low Salt"];
const AVAIL = [["", "All"], ["in_stock", "In Stock"]];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("featured");
  const [fish, setFish] = useState("All");
  const [salt, setSalt] = useState("All");
  const [avail, setAvail] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const category = params.get("category");
  const q = params.get("q");
  const combo = params.get("combo");
  const budgetMax = params.get("max_price");
  const budgetMin = params.get("min_price");

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (q) sp.set("q", q);
    if (combo) sp.set("is_combo", "true");
    if (fish !== "All") sp.set("fish_type", fish);
    if (salt !== "All") sp.set("salt_level", salt);
    if (avail) sp.set("availability", avail);
    if (budgetMax) sp.set("max_price", budgetMax);
    if (budgetMin) sp.set("min_price", budgetMin);
    if (maxPrice) sp.set("max_price", maxPrice);
    sp.set("sort", sort);
    api.get(`/products?${sp.toString()}`).then((r) => setProducts(r.data)).catch(() => setProducts([])).finally(() => setLoading(false));
  }, [category, q, combo, fish, salt, avail, sort, budgetMax, budgetMin, maxPrice]);

  const title = category || (combo ? "Combo Collection" : q ? `Search: "${q}"` : budgetMin ? "Premium ₹1000+" : budgetMax ? `Under ₹${budgetMax}` : "All Products");

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-ocean/60 font-semibold mb-3">Fish Type</p>
        <div className="flex flex-wrap gap-2">
          {FISH.map((f) => (
            <button key={f} onClick={() => setFish(f)} data-testid={`shop-fish-${f.toLowerCase().replace(/\s+/g, "-")}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${fish === f ? "bg-sunset text-white border-sunset" : "border-sand text-charcoal/70 hover:border-ocean/40"}`}>{f}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-ocean/60 font-semibold mb-3">Salt Level</p>
        <div className="flex flex-wrap gap-2">
          {SALT.map((f) => (
            <button key={f} onClick={() => setSalt(f)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${salt === f ? "bg-sunset text-white border-sunset" : "border-sand text-charcoal/70"}`}>{f}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-ocean/60 font-semibold mb-3">Availability</p>
        <div className="flex flex-wrap gap-2">
          {AVAIL.map(([v, l]) => (
            <button key={l} onClick={() => setAvail(v)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${avail === v ? "bg-sunset text-white border-sunset" : "border-sand text-charcoal/70"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-ocean/60 font-semibold mb-3">Max Price</p>
        <div className="flex flex-wrap gap-2">
          {["", "299", "499", "999", "1999"].map((p) => (
            <button key={p} onClick={() => setMaxPrice(p)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${maxPrice === p ? "bg-sunset text-white border-sunset" : "border-sand text-charcoal/70"}`}>{p ? `₹${p}` : "Any"}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs text-charcoal/50">Home / Shop</p>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-ocean mt-1">{title}</h1>
          <p className="text-sm text-charcoal/50 mt-1">{products.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(true)} className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full border border-ocean/20 text-ocean text-sm" data-testid="open-filters">
            <SlidersHorizontal size={16} /> Filters
          </button>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[190px] rounded-full" data-testid="sort-select"><SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block"><FilterPanel /></aside>
        <div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 text-charcoal/50" data-testid="empty-shop">No products found. Try adjusting your filters.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" data-testid="shop-grid">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ocean-dark/50" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-cream rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5"><h3 className="font-playfair text-xl text-ocean">Filters</h3><button onClick={() => setShowFilters(false)}><X /></button></div>
            <FilterPanel />
            <button onClick={() => setShowFilters(false)} className="w-full mt-6 py-3 rounded-full bg-sunset text-white font-semibold">Show {products.length} products</button>
          </div>
        </div>
      )}
    </div>
  );
}

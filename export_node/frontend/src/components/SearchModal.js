import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2 } from "lucide-react";
import api, { inr } from "@/lib/api";

export default function SearchModal({ onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/products/suggestions?q=${encodeURIComponent(q)}`)
        .then((r) => setResults(r.data)).catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (slug) => { onClose(); navigate(`/products/${slug}`); };
  const submit = (e) => { e.preventDefault(); onClose(); navigate(`/shop?q=${encodeURIComponent(q)}`); };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-20 md:pt-28 px-4" data-testid="search-modal">
      <div className="absolute inset-0 bg-ocean-dark/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-elevated overflow-hidden animate-fade-up">
        <form onSubmit={submit} className="flex items-center gap-3 p-4 border-b border-sand">
          <Search size={22} className="text-ocean" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search for Nethili, prawns, combos..." data-testid="search-input"
            className="flex-1 outline-none text-lg bg-transparent placeholder:text-muted-foreground" />
          {loading && <Loader2 size={18} className="animate-spin text-sunset" />}
          <button type="button" onClick={onClose}><X size={22} className="text-charcoal/50" /></button>
        </form>
        <div className="max-h-[50vh] overflow-y-auto">
          {q.trim().length >= 2 && results.length === 0 && !loading && (
            <p className="p-6 text-center text-muted-foreground">No products found for "{q}"</p>
          )}
          {results.map((r) => (
            <button key={r.id} onClick={() => go(r.slug)} data-testid={`search-result-${r.slug}`}
              className="w-full flex items-center gap-4 p-3 hover:bg-cream transition-colors text-left">
              <img src={r.image} alt={r.name} className="w-12 h-12 rounded-lg object-cover" loading="lazy" />
              <span className="font-medium text-charcoal">{r.name}</span>
            </button>
          ))}
          {q.trim().length < 2 && (
            <div className="p-5">
              <p className="text-xs uppercase tracking-widest text-ocean/60 mb-3">Popular</p>
              <div className="flex flex-wrap gap-2">
                {["Nethili", "Prawns", "Bombay Duck", "Boneless", "Combos", "King Fish"].map((t) => (
                  <button key={t} onClick={() => setQ(t)} className="px-3 py-1.5 rounded-full bg-sand text-sm text-ocean hover:bg-sunset hover:text-white transition-colors">{t}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

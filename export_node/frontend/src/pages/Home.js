import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Star, Leaf, ShieldCheck, Award, Truck, Quote } from "lucide-react";
import api, { inr } from "@/lib/api";
import { useStore } from "@/context/store";
import ProductCard from "@/components/ProductCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };

const SectionHead = ({ label, title, sub, center }) => (
  <div className={`mb-10 ${center ? "text-center max-w-2xl mx-auto" : ""}`}>
    {label && <p className="text-xs md:text-sm uppercase tracking-[0.22em] font-semibold text-sunset mb-2">{label}</p>}
    <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-ocean leading-tight">{title}</h2>
    {sub && <p className="text-charcoal/60 mt-3 text-base md:text-lg">{sub}</p>}
  </div>
);

const BUDGETS = [
  { label: "Under ₹299", max: 299 }, { label: "Under ₹499", max: 499 },
  { label: "Under ₹749", max: 749 }, { label: "Under ₹999", max: 999 },
  { label: "Premium ₹1000+", min: 1000 },
];

const FILTERS = ["All", "Anchovies", "Prawns", "Sardines", "Bombay Duck", "King Fish", "Ribbon Fish", "Squid", "Shark", "Boneless"];

export default function Home() {
  const { settings } = useStore();
  const [bestsellers, setBestsellers] = useState([]);
  const [combos, setCombos] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [filter, setFilter] = useState("All");
  const [rvIdx, setRvIdx] = useState(0);

  useEffect(() => {
    api.get("/products?bestseller=true&is_combo=false").then((r) => setBestsellers(r.data)).catch(() => {});
    api.get("/products?is_combo=true").then((r) => setCombos(r.data)).catch(() => {});
    api.get("/categories").then((r) => setCategories(r.data)).catch(() => {});
    api.get("/reviews").then((r) => setReviews(r.data)).catch(() => {});
    api.get("/recipes?featured=true").then((r) => setRecipes(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const q = filter === "All" ? "" : `?fish_type=${encodeURIComponent(filter)}`;
    api.get(`/products${q}`).then((r) => setFeatured(r.data.filter((p) => !p.is_combo))).catch(() => {});
  }, [filter]);

  const heroTitle = (settings.hero_title || "AUTHENTIC SHUTKI.\nPURE COASTAL FLAVOUR.").split("\n");

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src={settings.hero_image} alt="Premium sun-dried fish" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ocean-dark/95 via-ocean-dark/70 to-ocean-dark/20" />
        </div>
        <div className="relative max-w-[1440px] mx-auto px-5 md:px-8 py-24 md:py-36 lg:py-44">
          <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.12 }} className="max-w-2xl">
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-sunset font-semibold tracking-[0.2em] uppercase text-sm mb-4">
              Authentic Shutki · Coastal Taste
            </motion.p>
            <motion.h1 variants={fadeUp} transition={{ duration: 0.5 }} className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-extrabold text-cream leading-[1.05]">
              {heroTitle.map((l, i) => <span key={i} className="block">{l}</span>)}
            </motion.h1>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-cream/80 text-base md:text-lg mt-5 max-w-lg leading-relaxed">
              {settings.hero_subtitle}
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="flex flex-wrap gap-4 mt-8">
              <Link to="/shop" data-testid="hero-shop-btn" className="px-7 py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors flex items-center gap-2">
                Shop Dry Fish <ArrowRight size={18} />
              </Link>
              <Link to="/shop?combo=1" data-testid="hero-combo-btn" className="px-7 py-3.5 rounded-full border border-cream/40 text-cream font-semibold hover:bg-cream hover:text-ocean transition-colors">
                Explore Combos
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} transition={{ duration: 0.5 }} className="text-cream/70 text-xs md:text-sm mt-8 tracking-wide">
              Traditional Taste • Hygienically Packed • Delivered Across India
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* MARQUEE STRIP */}
      <div className="bg-ocean text-cream py-3 overflow-hidden border-y border-cream/10">
        <div className="flex gap-10 whitespace-nowrap animate-marquee w-max">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-10 items-center text-sm font-medium tracking-wide">
              {["Traditional Sun-Dried", "Hygienically Packed", "Pan-India Delivery", "Quality Selected", "Secure Payments", "Free Shipping on Prepaid", "Authentic Coastal Taste"].map((t) => (
                <span key={t} className="flex items-center gap-10"><span>{t}</span><span className="text-sunset">◆</span></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* CATEGORIES */}
      <section className="max-w-[1440px] mx-auto px-5 md:px-8 py-14 md:py-20" data-testid="category-section">
        <SectionHead label="Explore" title="Shop by Category" />
        <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
          {categories.map((c) => (
            <Link key={c.id} to={`/shop?category=${encodeURIComponent(c.name)}`} data-testid={`category-${c.slug}`}
              className="group shrink-0 w-28 md:w-36 text-center">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-soft mb-3 group-hover:shadow-elevated transition-shadow">
                <img src={c.image} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <span className="text-sm font-medium text-charcoal group-hover:text-sunset transition-colors">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* SHOP BY BUDGET */}
      <section className="bg-sand/60 py-14 md:py-20" data-testid="budget-section">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8">
          <SectionHead label="Value Picks" title="Shop by Budget" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {BUDGETS.map((b, i) => {
              const query = b.min ? `?min_price=${b.min}` : `?max_price=${b.max}`;
              return (
                <Link key={b.label} to={`/shop${query}`} data-testid={`budget-${i}`}
                  className="group relative rounded-2xl overflow-hidden bg-white shadow-soft hover:shadow-elevated transition-shadow p-6 flex flex-col items-start min-h-[160px] justify-between">
                  <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sunset/10 group-hover:bg-sunset/20 transition-colors" />
                  <div className="relative">
                    <p className="font-playfair text-2xl font-bold text-ocean">{b.label}</p>
                  </div>
                  <span className="relative inline-flex items-center gap-1.5 text-sm font-semibold text-sunset">
                    Shop Now <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="max-w-[1440px] mx-auto px-5 md:px-8 py-14 md:py-20" data-testid="bestsellers-section">
        <SectionHead label="Most Loved" title="Bestselling Shutki" sub="Our most-loved coastal favourites." />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {bestsellers.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* COMBOS */}
      <section className="bg-ocean-dark grain py-16 md:py-24" data-testid="combo-section">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8 relative">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <p className="text-sunset text-xs md:text-sm uppercase tracking-[0.22em] font-semibold mb-2">Bundle & Save</p>
            <h2 className="font-playfair text-3xl md:text-5xl font-bold text-cream">The Shutki Combo Collection</h2>
            <p className="text-cream/60 mt-3">More variety. More flavour. More savings.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {combos.map((c) => (
              <div key={c.id} className="bg-cream rounded-2xl overflow-hidden shadow-elevated group flex flex-col" data-testid={`combo-card-${c.slug}`}>
                <div className="relative overflow-hidden">
                  <img src={(c.images || [])[0]} alt={c.name} loading="lazy" className="aspect-[4/3] w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {c.badge && <span className="absolute top-3 left-3 bg-sunset text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">{c.badge}</span>}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-playfair text-lg font-bold text-ocean">{c.name}</h3>
                  <div className="flex gap-3 text-xs text-charcoal/60 mt-1.5 mb-3">
                    <span>{c.combo_meta?.weight}</span>·<span>{c.combo_meta?.varieties} varieties</span>·<span>Serves {c.combo_meta?.servings}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-auto">
                    <span className="font-bold text-xl text-ocean">{inr((c.variants || [])[0]?.price)}</span>
                    <span className="text-sm text-muted-foreground line-through">{inr((c.variants || [])[0]?.mrp)}</span>
                  </div>
                  <p className="text-xs text-green-600 font-semibold mb-3">Save {inr(c.combo_meta?.savings)}</p>
                  <Link to={`/products/${c.slug}`} data-testid={`combo-view-${c.slug}`} className="w-full text-center py-2.5 rounded-full bg-sunset text-white text-sm font-semibold hover:bg-sunset-hover transition-colors">
                    View Combo
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROMO STRIP */}
      <section className="max-w-[1440px] mx-auto px-5 md:px-8 py-10" data-testid="promo-strip">
        <div className="rounded-3xl bg-sunset/10 border border-sunset/20 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sunset font-semibold uppercase tracking-widest text-sm">First Order Offer</p>
            <h3 className="font-playfair text-2xl md:text-3xl font-bold text-ocean mt-1">{settings.promo_text || "Get 10% OFF on your first order"}</h3>
            <p className="text-charcoal/60 text-sm mt-2">Free shipping above {inr(settings.free_shipping_above || 499)} · Secure payments · Pan-India delivery</p>
          </div>
          <Link to="/shop" className="px-8 py-3.5 rounded-full bg-ocean text-cream font-semibold hover:bg-ocean-light transition-colors shrink-0" data-testid="promo-shop-btn">
            Shop Now
          </Link>
        </div>
      </section>

      {/* TRUST CARDS */}
      <section className="max-w-[1440px] mx-auto px-5 md:px-8 py-14 md:py-20" data-testid="trust-section">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            [Leaf, "Traditional Taste", "Authentic sun-dried coastal flavours."],
            [ShieldCheck, "Hygienically Packed", "Carefully cleaned, processed and packed."],
            [Award, "Quality Selected", "Only quality products make it to our catalogue."],
            [Truck, "Pan-India Delivery", "Delivered safely to customers across India."],
          ].map(([Icon, t, d]) => (
            <div key={t} className="bg-sand rounded-2xl p-6 flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center"><Icon className="text-sunset" size={24} /></div>
              <h4 className="font-playfair text-lg font-semibold text-ocean">{t}</h4>
              <p className="text-sm text-charcoal/60">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED w/ filters */}
      <section className="bg-sand/60 py-14 md:py-20" data-testid="featured-section">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8">
          <SectionHead label="Discover" title="Explore Our Shutki" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)} data-testid={`filter-${f.toLowerCase().replace(/\s+/g, "-")}`}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f ? "bg-ocean text-cream" : "bg-white text-charcoal/70 hover:bg-sunset/10"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featured.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {featured.length === 0 && <p className="text-center text-charcoal/50 py-10">No products in this category yet.</p>}
          <div className="text-center mt-10">
            <Link to="/shop" className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-ocean text-ocean font-semibold hover:bg-ocean hover:text-cream transition-colors">
              View All Products <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* BRAND STORY */}
      <section className="max-w-[1440px] mx-auto px-5 md:px-8 py-16 md:py-24" data-testid="story-section">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="rounded-3xl overflow-hidden shadow-elevated order-2 lg:order-1">
            <img src="https://static.prod-images.emergentagent.com/jobs/db2212d3-eb5d-4aac-b4dc-f2966de0720e/images/4b7b47d4d0785784460b68bf537bb54aecd9c4ab5cbe8073e33d750616721593.jpeg" alt="Coastal fishing village" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-sunset font-semibold uppercase tracking-[0.22em] text-sm mb-3">Our Story</p>
            <h2 className="font-playfair text-3xl md:text-5xl font-bold text-ocean leading-tight">From the Coast to Your Kitchen</h2>
            <p className="text-charcoal/70 mt-5 text-base md:text-lg leading-relaxed">
              TheShutki.com brings the authentic taste of traditional sun-dried fish to modern Indian kitchens. We carefully source quality seafood, prepare it with traditional methods and pack it with care so you can enjoy the bold, distinctive flavour of authentic Shutki wherever you are.
            </p>
            <Link to="/about" className="inline-flex items-center gap-2 mt-7 px-7 py-3 rounded-full bg-ocean text-cream font-semibold hover:bg-ocean-light transition-colors">
              Our Story <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-sand/60 py-14 md:py-20" data-testid="how-section">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8">
          <SectionHead label="Simple & Easy" title="How It Works" center />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[["01", "Select", "Choose your favourite Shutki."], ["02", "Order", "Place your order securely online."],
              ["03", "Pack", "We carefully pack your selection."], ["04", "Deliver", "Your order reaches your doorstep."]].map(([n, t, d]) => (
              <div key={n} className="text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-ocean text-cream font-playfair text-2xl font-bold flex items-center justify-center mb-4">{n}</div>
                <h4 className="font-playfair text-xl font-semibold text-ocean">{t}</h4>
                <p className="text-sm text-charcoal/60 mt-1.5">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 md:px-8 py-16 md:py-24" data-testid="reviews-section">
          <SectionHead label="Testimonials" title="Loved by Shutki Lovers" center />
          <div className="relative max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-elevated p-8 md:p-12 text-center">
              <Quote className="mx-auto text-sunset/40 mb-4" size={40} />
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: reviews[rvIdx]?.rating || 5 }).map((_, i) => <Star key={i} size={18} className="fill-sunset text-sunset" />)}
              </div>
              <p className="font-playfair text-xl md:text-2xl text-charcoal leading-relaxed">"{reviews[rvIdx]?.text}"</p>
              <p className="mt-5 font-semibold text-ocean">{reviews[rvIdx]?.name}</p>
              {reviews[rvIdx]?.verified && <p className="text-xs text-green-600">✓ Verified Buyer</p>}
            </div>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => setRvIdx((i) => (i - 1 + reviews.length) % reviews.length)} data-testid="review-prev"
                className="h-10 w-10 rounded-full border border-ocean/20 flex items-center justify-center hover:bg-ocean hover:text-cream transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={() => setRvIdx((i) => (i + 1) % reviews.length)} data-testid="review-next"
                className="h-10 w-10 rounded-full border border-ocean/20 flex items-center justify-center hover:bg-ocean hover:text-cream transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
        </section>
      )}

      {/* INSTAGRAM */}
      <section className="bg-sand/60 py-14 md:py-20" data-testid="instagram-section">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8">
          <SectionHead label="@theshutki" title="Follow the Shutki Journey" center />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
            {(settings.social_images || []).map((img, i) => (
              <a key={i} href={settings.instagram || "#"} target="_blank" rel="noreferrer" className="group relative rounded-xl overflow-hidden aspect-square">
                <img src={img} alt="Instagram post" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-ocean/0 group-hover:bg-ocean/30 transition-colors" />
              </a>
            ))}
          </div>
          <div className="text-center mt-8">
            <a href={settings.instagram || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-ocean text-cream font-semibold hover:bg-ocean-light transition-colors">
              Follow Us on Instagram
            </a>
          </div>
        </div>
      </section>

      {/* RECIPES */}
      {recipes.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-5 md:px-8 py-14 md:py-20" data-testid="recipes-home-section">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-xs md:text-sm uppercase tracking-[0.22em] font-semibold text-sunset mb-2">The Coastal Kitchen</p>
              <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-ocean leading-tight">Cook It Like the Coast</h2>
              <p className="text-charcoal/60 mt-3 text-base md:text-lg">Authentic Shutki recipes to try at home.</p>
            </div>
            <Link to="/recipes" className="hidden md:inline-flex items-center gap-2 px-6 py-3 rounded-full border border-ocean text-ocean font-semibold hover:bg-ocean hover:text-cream transition-colors">All Recipes <ArrowRight size={16} /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
            {recipes.slice(0, 3).map((r) => (
              <Link key={r.id} to={`/recipes/${r.slug}`} data-testid={`home-recipe-${r.slug}`} className="group rounded-2xl overflow-hidden shadow-soft hover:shadow-elevated transition-shadow bg-white">
                <div className="relative overflow-hidden">
                  <img src={r.image} alt={r.title} loading="lazy" className="aspect-[4/3] w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute bottom-3 left-3 bg-cream/90 backdrop-blur text-ocean text-xs font-semibold px-2.5 py-1 rounded-full">{r.time} · {r.difficulty}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-playfair text-xl font-bold text-ocean group-hover:text-sunset transition-colors">{r.title}</h3>
                  <p className="text-sm text-charcoal/60 mt-1.5 line-clamp-2">{r.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24" data-testid="faq-section">
        <SectionHead label="Help Centre" title="Frequently Asked Questions" center />
        <Accordion type="single" collapsible className="w-full">
          {[
            ["What is Shutki?", "Shutki is traditional sun-dried fish, a beloved coastal delicacy known for its bold, concentrated flavour used in authentic curries, fries and chutneys."],
            ["How is the dry fish prepared?", "Our fish is cleaned and traditionally sun-dried, then hygienically graded and packed to preserve its natural flavour and texture."],
            ["How should I store Shutki?", "Store in an airtight container in a cool, dry place away from sunlight. Refrigerate after opening for longer freshness."],
            ["How long does Shutki stay fresh?", "When stored properly in an airtight container, our Shutki stays fresh for several months. Always check packaging for details."],
            ["Do you offer different weights?", "Yes — most products are available in 250g, 500g and 1kg packs, plus combo boxes."],
            ["Do you deliver across India?", "Yes, we deliver pan-India to most serviceable pincodes."],
            ["What are the shipping charges?", `Shipping is free on prepaid orders above ${inr(settings.free_shipping_above || 499)}. A small charge may apply on COD orders below the threshold.`],
            ["How can I track my order?", "Once your order ships, you can track it from the My Account section using your order ID."],
            ["Can I return or replace an order?", "If you receive a damaged or incorrect item, contact us within 48 hours and we'll arrange a replacement."],
            ["Do you offer bulk orders?", "Yes! Reach out via WhatsApp for bulk and wholesale enquiries."],
          ].map(([q, a], i) => (
            <AccordionItem key={i} value={`faq-${i}`} data-testid={`faq-${i}`}>
              <AccordionTrigger className="text-left font-playfair text-base md:text-lg text-ocean hover:text-sunset">{q}</AccordionTrigger>
              <AccordionContent className="text-charcoal/70 text-base">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}

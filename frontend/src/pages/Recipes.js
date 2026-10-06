import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Users, ChefHat, ArrowRight } from "lucide-react";
import api from "@/lib/api";

export default function Recipes() {
  const [recipes, setRecipes] = useState([]);
  useEffect(() => { window.scrollTo(0, 0); document.title = "Coastal Recipes — TheShutki.com"; api.get("/recipes").then((r) => setRecipes(r.data)); }, []);

  return (
    <div>
      <section className="relative">
        <img src="https://static.prod-images.emergentagent.com/jobs/db2212d3-eb5d-4aac-b4dc-f2966de0720e/images/bb8de3f4be1b7891478f9541be6f745f10bcd78fa67e12c37880107f14cbccbb.jpeg" alt="Shutki recipes" className="w-full h-56 md:h-80 object-cover" />
        <div className="absolute inset-0 bg-ocean-dark/65 flex items-center justify-center text-center px-5">
          <div>
            <p className="text-sunset font-semibold uppercase tracking-[0.22em] text-sm">The Coastal Kitchen</p>
            <h1 className="font-playfair text-4xl md:text-6xl font-bold text-cream mt-2">Shutki Recipes</h1>
            <p className="text-cream/80 mt-3 max-w-xl mx-auto">Bold, authentic coastal dishes you can make at home.</p>
          </div>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {recipes.map((r) => (
            <Link key={r.id} to={`/recipes/${r.slug}`} data-testid={`recipe-card-${r.slug}`}
              className="group bg-white rounded-2xl shadow-soft hover:shadow-elevated transition-shadow overflow-hidden flex flex-col">
              <div className="overflow-hidden">{r.image ? <img src={r.image} alt={r.title} loading="lazy" className="aspect-[4/3] w-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="aspect-[4/3] w-full bg-sand" />}</div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-playfair text-xl font-bold text-ocean">{r.title}</h3>
                <p className="text-sm text-charcoal/60 mt-1.5 flex-1">{r.subtitle}</p>
                <div className="flex gap-4 text-xs text-charcoal/50 mt-4">
                  <span className="flex items-center gap-1"><Clock size={13} /> {r.time}</span>
                  <span className="flex items-center gap-1"><Users size={13} /> {r.serves}</span>
                  <span className="flex items-center gap-1"><ChefHat size={13} /> {r.difficulty}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sunset mt-4">View Recipe <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

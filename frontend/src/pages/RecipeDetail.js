import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Clock, Users, ChefHat, Fish, ChevronRight } from "lucide-react";
import api from "@/lib/api";

export default function RecipeDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get(`/recipes/${slug}`).then((res) => { setR(res.data); document.title = `${res.data.title} — TheShutki.com`; }).catch(() => navigate("/recipes"));
  }, [slug, navigate]);

  if (!r) return <div className="min-h-[50vh] flex items-center justify-center text-ocean">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-8 md:py-12">
      <nav className="flex items-center gap-1.5 text-xs text-charcoal/50 mb-5">
        <Link to="/" className="hover:text-sunset">Home</Link><ChevronRight size={12} />
        <Link to="/recipes" className="hover:text-sunset">Recipes</Link><ChevronRight size={12} />
        <span className="text-ocean">{r.title}</span>
      </nav>

      <div className="rounded-3xl overflow-hidden shadow-elevated mb-8">
        <img src={r.image} alt={r.title} className="w-full aspect-[16/9] object-cover" />
      </div>

      <h1 className="font-playfair text-3xl md:text-5xl font-bold text-ocean">{r.title}</h1>
      <p className="text-charcoal/60 mt-3 text-lg">{r.subtitle}</p>
      <div className="flex gap-5 text-sm text-charcoal/60 mt-5 flex-wrap">
        <span className="flex items-center gap-1.5"><Clock size={16} className="text-sunset" /> {r.time}</span>
        <span className="flex items-center gap-1.5"><Users size={16} className="text-sunset" /> Serves {r.serves}</span>
        <span className="flex items-center gap-1.5"><ChefHat size={16} className="text-sunset" /> {r.difficulty}</span>
        <span className="flex items-center gap-1.5"><Fish size={16} className="text-sunset" /> {r.fish_used}</span>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-10 mt-10">
        <div className="bg-sand/60 rounded-2xl p-6 h-fit">
          <h2 className="font-playfair text-xl font-bold text-ocean mb-4">Ingredients</h2>
          <ul className="space-y-2.5">
            {r.ingredients.map((ing, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-charcoal/80"><span className="h-1.5 w-1.5 rounded-full bg-sunset mt-2 shrink-0" />{ing}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-playfair text-xl font-bold text-ocean mb-4">Method</h2>
          <ol className="space-y-5">
            {r.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="h-8 w-8 rounded-full bg-ocean text-cream font-playfair font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <p className="text-charcoal/80 pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="text-center mt-14 p-8 rounded-3xl bg-sunset/10 border border-sunset/20">
        <h3 className="font-playfair text-2xl font-bold text-ocean">Get the Shutki for this recipe</h3>
        <Link to="/shop" className="inline-block mt-5 px-8 py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors">Shop Now</Link>
      </div>
    </div>
  );
}

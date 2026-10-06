import React from "react";
import { Link } from "react-router-dom";
import { Leaf, ShieldCheck, Award, Truck } from "lucide-react";

export default function About() {
  return (
    <div>
      <section className="relative">
        <img src="https://static.prod-images.emergentagent.com/jobs/db2212d3-eb5d-4aac-b4dc-f2966de0720e/images/4b7b47d4d0785784460b68bf537bb54aecd9c4ab5cbe8073e33d750616721593.jpeg" alt="Coast" className="w-full h-64 md:h-96 object-cover" />
        <div className="absolute inset-0 bg-ocean-dark/60 flex items-center justify-center">
          <div className="text-center px-5">
            <h1 className="font-playfair text-4xl md:text-6xl font-bold text-cream">Our Story</h1>
            <p className="text-cream/80 mt-3 max-w-xl mx-auto">Authentic Shutki. Coastal Taste. Delivered Fresh.</p>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 py-14 md:py-20 text-center">
        <h2 className="font-playfair text-3xl md:text-4xl font-bold text-ocean">From the Coast to Your Kitchen</h2>
        <p className="text-charcoal/70 mt-5 leading-relaxed text-lg">
          TheShutki.com brings the authentic taste of traditional sun-dried fish to modern Indian kitchens. We carefully source quality seafood from coastal fishing communities, prepare it with time-honoured traditional methods and pack it with care so you can enjoy the bold, distinctive flavour of authentic Shutki wherever you are in India.
        </p>
        <p className="text-charcoal/70 mt-4 leading-relaxed text-lg">
          Every batch is cleaned, graded and hygienically packed, preserving the natural flavour and texture that coastal kitchens have cherished for generations.
        </p>
      </section>

      <section className="bg-sand/60 py-14 md:py-20">
        <div className="max-w-[1440px] mx-auto px-5 md:px-8 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[[Leaf, "Traditional Taste"], [ShieldCheck, "Hygienically Packed"], [Award, "Quality Selected"], [Truck, "Pan-India Delivery"]].map(([Icon, t]) => (
            <div key={t} className="bg-white rounded-2xl p-6 flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-sunset/10 flex items-center justify-center"><Icon className="text-sunset" size={24} /></div>
              <h4 className="font-playfair text-lg font-semibold text-ocean">{t}</h4>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-xl mx-auto px-5 py-16 text-center">
        <h2 className="font-playfair text-2xl md:text-3xl font-bold text-ocean">Taste the Coast Today</h2>
        <Link to="/shop" className="inline-block mt-6 px-8 py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors">Shop Dry Fish</Link>
      </section>
    </div>
  );
}

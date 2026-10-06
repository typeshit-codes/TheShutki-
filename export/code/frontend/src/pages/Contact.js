import React from "react";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/context/store";

export default function Contact() {
  const { settings } = useStore();
  const submit = (e) => { e.preventDefault(); toast.success("Thanks! We'll get back to you shortly."); e.target.reset(); };
  const inputCls = "w-full px-4 py-3 rounded-xl border border-sand outline-none focus:border-sunset bg-white";

  return (
    <div className="max-w-[1440px] mx-auto px-5 md:px-8 py-12 md:py-16">
      <div className="text-center mb-12">
        <p className="text-sunset font-semibold uppercase tracking-[0.22em] text-sm">Get in Touch</p>
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-ocean mt-2">Contact Us</h1>
        <p className="text-charcoal/60 mt-3">We'd love to hear from you — for orders, bulk enquiries or support.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-5">
          {[[Phone, "Phone", settings.phone || "+91 98765 43210"], [MessageCircle, "WhatsApp", settings.whatsapp_number || "919876543210"],
            [Mail, "Email", settings.email || "care@theshutki.com"], [MapPin, "Address", settings.address]].map(([Icon, t, v]) => (
            <div key={t} className="flex gap-4 bg-white rounded-2xl shadow-soft p-5">
              <div className="h-12 w-12 rounded-full bg-sunset/10 flex items-center justify-center shrink-0"><Icon className="text-sunset" size={22} /></div>
              <div><p className="font-semibold text-ocean">{t}</p><p className="text-charcoal/60 text-sm">{v}</p></div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-soft p-6 space-y-4" data-testid="contact-form">
          <input className={inputCls} placeholder="Your Name" required data-testid="contact-name" />
          <input className={inputCls} type="email" placeholder="Your Email" required data-testid="contact-email" />
          <input className={inputCls} placeholder="Subject" data-testid="contact-subject" />
          <textarea className={`${inputCls} min-h-32`} placeholder="Your Message" required data-testid="contact-message" />
          <button type="submit" className="w-full py-3.5 rounded-full bg-sunset text-white font-semibold hover:bg-sunset-hover transition-colors" data-testid="contact-submit">Send Message</button>
        </form>
      </div>
    </div>
  );
}

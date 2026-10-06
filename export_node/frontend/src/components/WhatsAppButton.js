import React from "react";
import { MessageCircle } from "lucide-react";
import { useStore } from "@/context/store";

export default function WhatsAppButton() {
  const { settings } = useStore();
  const num = settings.whatsapp_number || "919876543210";
  const msg = encodeURIComponent("Hi TheShutki! I'd like to know more about your products.");
  return (
    <a href={`https://wa.me/${num}?text=${msg}`} target="_blank" rel="noreferrer"
      data-testid="whatsapp-button"
      className="fixed right-4 bottom-20 lg:bottom-6 z-40 h-13 w-13 md:h-14 md:w-14 rounded-full bg-green-500 shadow-elevated flex items-center justify-center hover:scale-110 transition-transform"
      style={{ height: 54, width: 54 }} aria-label="Chat on WhatsApp">
      <MessageCircle size={27} className="text-white fill-white/0" />
      <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30" />
    </a>
  );
}

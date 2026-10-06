import React from "react";
import { Check, Clock } from "lucide-react";

const STEPS = [
  ["pending", "Order Placed"],
  ["confirmed", "Confirmed"],
  ["processing", "Processing"],
  ["packed", "Packed"],
  ["shipped", "Shipped"],
  ["out_for_delivery", "Out for Delivery"],
  ["delivered", "Delivered"],
];

export default function OrderTimeline({ status }) {
  if (status === "cancelled") {
    return <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium" data-testid="order-timeline-cancelled">This order was cancelled.</div>;
  }
  const idx = STEPS.findIndex(([s]) => s === status);
  const current = idx === -1 ? 0 : idx;
  return (
    <div className="py-2" data-testid="order-timeline">
      <div className="flex flex-col gap-0">
        {STEPS.map(([s, label], i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={s} className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? "bg-green-500 text-white" : active ? "bg-sunset text-white" : "bg-sand text-charcoal/40"}`}>
                  {done ? <Check size={16} /> : active ? <Clock size={15} /> : <span className="text-xs">{i + 1}</span>}
                </div>
                {i < STEPS.length - 1 && <div className={`w-0.5 h-8 ${done ? "bg-green-500" : "bg-sand"}`} />}
              </div>
              <div className={`pb-5 ${active ? "font-semibold text-ocean" : done ? "text-charcoal/70" : "text-charcoal/40"}`}>
                <p className="text-sm">{label}</p>
                {active && <p className="text-xs text-sunset">Current status</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import WhatsAppButton from "@/components/WhatsAppButton";
import SearchModal from "@/components/SearchModal";

export default function Layout() {
  const [search, setSearch] = useState(false);
  return (
    <div className="App min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav onSearch={() => setSearch(true)} />
      <WhatsAppButton />
      {search && <SearchModal onClose={() => setSearch(false)} />}
    </div>
  );
}

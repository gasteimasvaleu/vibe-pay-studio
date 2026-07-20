import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function Navbar({ minimal = false }: { minimal?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logo = (
    <Link to="/" className="flex items-center gap-2">
      <span className="text-xl font-black tracking-tight">
        <span className="text-black">moneti</span>
        <span className="text-gradient-primary">sexy.</span>
      </span>
    </Link>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-lg border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-start">
        {logo}
      </div>
    </header>
  );
}

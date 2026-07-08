import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Globe } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { to: "/como-funciona", label: "Como Funciona" },
    { to: "/sobre", label: "Sobre" },
    { to: "/blog", label: "Blog" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/80 backdrop-blur-lg border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight">
            monet<span className="text-gradient-primary">ize</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wider">
            <Globe className="w-4 h-4" /> PT
          </button>
          <Link
            to="/entrar"
            className="px-4 py-2 text-sm font-semibold rounded-full border border-border hover:border-foreground transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="px-5 py-2 text-sm font-semibold rounded-full bg-gradient-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-glow"
          >
            Criar conta
          </Link>
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-black/95 backdrop-blur-lg border-b border-border">
          <div className="px-4 py-6 flex flex-col gap-4">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-base font-medium text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Link
                to="/entrar"
                onClick={() => setOpen(false)}
                className="flex-1 py-2 text-center text-sm font-semibold rounded-full border border-border"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                onClick={() => setOpen(false)}
                className="flex-1 py-2 text-center text-sm font-semibold rounded-full bg-gradient-primary"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

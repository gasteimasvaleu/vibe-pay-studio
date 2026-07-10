import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div>
            <span className="text-2xl font-black tracking-tight">
              monet<span className="text-gradient-primary">isex</span>
            </span>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              A maior plataforma de creator economy do Brasil.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          <FooterCol
            title="Institucional"
            links={[
              ["Sobre", "/sobre"],
              ["Imprensa", "#"],
              ["Contato", "#"],
              ["Uso da Marca", "#"],
              ["Ajuda & FAQ", "#"],
            ]}
          />
          <FooterCol
            title="Criador"
            links={[
              ["Blog", "#"],
              ["Como Funciona", "/como-funciona"],
              ["Parcerias", "#"],
              ["Agências", "#"],
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              ["Privacidade", "#"],
              ["Termos e Políticas", "#"],
              ["Centro de Segurança", "#"],
              ["Política de Reclamações", "#"],
              ["DMCA", "#"],
            ]}
          />
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-start gap-4 text-xs text-muted-foreground">
          <p>©2026 Monetisexy. Todos os direitos reservados.</p>
          <p className="max-w-md">
            Plataforma exclusiva para maiores de 18 anos. Conteúdo protegido por DRM.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="label-caps text-foreground mb-4">{title}</h4>
      <ul className="space-y-3">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") ? (
              <Link to={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </Link>
            ) : (
              <a href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { Instagram, Youtube, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#AE87EC] pt-8 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card border border-border rounded-3xl shadow-card overflow-hidden">
          <div className="p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              <div>
              <span className="text-2xl font-black tracking-tight text-card-foreground">
                <span className="text-black">moneti</span>
                <span className="text-gradient-primary">sexy.</span>
              </span>
                <p className="mt-4 text-sm text-card-foreground/80 max-w-xs">
                  A maior plataforma de creator economy do Brasil.
                </p>
                <div className="flex items-center gap-4 mt-6">
                  <a href="#" aria-label="Instagram" className="text-card-foreground/70 hover:text-primary transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href="#" aria-label="YouTube" className="text-card-foreground/70 hover:text-primary transition-colors">
                    <Youtube className="w-5 h-5" />
                  </a>
                  <a href="#" aria-label="Twitter" className="text-card-foreground/70 hover:text-primary transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                </div>
              </div>

              <FooterCol
                title="Institucional"
                links={[
                  ["Sobre", "/sobre"],
                  ["Imprensa", "#"],
                  ["Contato", "/contato"],
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
                  ["Privacidade", "/privacidade"],
                  ["Termos e Políticas", "/termos-e-politicas"],
                  ["Centro de Segurança", "/centro-e-seguranca"],
                  ["Política de Reclamações", "/politicadereclamacoes"],
                  ["DMCA", "/dmca"],
                ]}
              />
            </div>
          </div>

          <div className="px-8 md:px-10 py-6 border-t border-border flex flex-col md:flex-row justify-between items-start gap-4 text-xs text-card-foreground/70">
            <p>©2026 Monetisexy. Todos os direitos reservados.</p>
            <p className="max-w-md">
              Plataforma exclusiva para maiores de 18 anos. Conteúdo protegido por DRM.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="label-caps text-card-foreground mb-4">{title}</h4>
      <ul className="space-y-3">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") ? (
              <Link to={href} className="text-sm text-card-foreground/80 hover:text-primary transition-colors">
                {label}
              </Link>
            ) : (
              <a href={href} className="text-sm text-card-foreground/80 hover:text-primary transition-colors">
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

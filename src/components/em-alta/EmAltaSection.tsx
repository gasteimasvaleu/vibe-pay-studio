import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { EmAltaSectionSlug } from "@/lib/em-alta.types";

export function EmAltaSection({
  title,
  icon,
  section,
  children,
}: {
  title: string;
  icon?: ReactNode;
  section?: EmAltaSectionSlug;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 -mx-4 md:-mx-6">
      <div className="flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-bold text-foreground">{title}</h2>
        </div>
        {section && (
          <Link
            to="/em-alta/$section"
            params={{ section }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Ver mais em ${title}`}
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-4 md:px-6 scroll-px-4 md:scroll-px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

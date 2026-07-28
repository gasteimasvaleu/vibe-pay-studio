import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Check, FolderOpen, Play, Search, X } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  listVaultCategories,
  listVaultCategoryItems,
  listVaultChatMedia,
  listVaultPublicationMedia,
  listVaultUploads,
  type VaultMediaItem,
} from "@/lib/vault.functions";

type FixedTab = "todas" | "publicacoes" | "conversas" | "envios";
type ActiveTab = { kind: "fixed"; key: FixedTab } | { kind: "category"; id: string; name: string };
type MediaFilter = "TODAS" | "FOTO" | "VÍDEO" | "GIF";

const FIXED_TABS: Array<{ key: FixedTab; label: string }> = [
  { key: "todas", label: "Todas" },
  { key: "publicacoes", label: "Publicações" },
  { key: "conversas", label: "Conversas" },
  { key: "envios", label: "Envios" },
];

const MEDIA_FILTERS: MediaFilter[] = ["TODAS", "FOTO", "VÍDEO", "GIF"];

function filterMatches(itemType: VaultMediaItem["type"], f: MediaFilter) {
  if (f === "TODAS") return true;
  if (f === "FOTO") return itemType === "image";
  if (f === "VÍDEO") return itemType === "video";
  if (f === "GIF") return itemType === "gif";
  return true;
}

export type VaultPickerSheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Máximo de itens que o usuário pode selecionar/adicionar (respeitar slots restantes). */
  maxSelectable?: number;
  /** "media" = múltiplos itens, "preview" = apenas 1. */
  mode?: "media" | "preview";
  onConfirm: (items: VaultMediaItem[]) => void;
};

export function VaultPickerSheet({
  open,
  onOpenChange,
  maxSelectable = 10,
  mode = "media",
  onConfirm,
}: VaultPickerSheetProps) {
  const singleSelect = mode === "preview";
  const cap = singleSelect ? 1 : Math.max(1, maxSelectable);

  const [activeTab, setActiveTab] = useState<ActiveTab>({ kind: "fixed", key: "todas" });
  const [filter, setFilter] = useState<MediaFilter>("TODAS");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, VaultMediaItem>>({});

  const listCategories = useServerFn(listVaultCategories);
  const listPublications = useServerFn(listVaultPublicationMedia);
  const listUploads = useServerFn(listVaultUploads);
  const listChat = useServerFn(listVaultChatMedia);
  const listCategoryItems = useServerFn(listVaultCategoryItems);

  const categoriesQuery = useQuery({
    queryKey: ["vault-picker", "categories"],
    queryFn: () => listCategories(),
    enabled: open,
    staleTime: 60_000,
  });

  const itemsQuery = useQuery<VaultMediaItem[]>({
    queryKey: ["vault-picker", "items", activeTab],
    queryFn: async () => {
      if (activeTab.kind === "category") {
        return await listCategoryItems({ data: { categoryId: activeTab.id } });
      }
      switch (activeTab.key) {
        case "publicacoes":
          return await listPublications({ data: {} });
        case "conversas":
          return await listChat();
        case "envios":
          return await listUploads({ data: {} });
        case "todas":
        default: {
          const [pubs, ups, chat] = await Promise.all([
            listPublications({ data: {} }),
            listUploads({ data: {} }),
            listChat(),
          ]);
          const merged = [...pubs, ...ups, ...chat];
          merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          return merged;
        }
      }
    },
    enabled: open,
    staleTime: 30_000,
  });

  const filteredItems = useMemo(() => {
    const raw = itemsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return raw.filter((it) => {
      if (!filterMatches(it.type, filter)) return false;
      // O publisher não aceita áudio.
      if (it.type === "audio") return false;
      if (!q) return true;
      return (it.caption ?? "").toLowerCase().includes(q);
    });
  }, [itemsQuery.data, filter, search]);

  const selectedCount = Object.keys(selected).length;
  const canConfirm = selectedCount > 0;

  const toggle = (item: VaultMediaItem) => {
    setSelected((prev) => {
      if (prev[item.key]) {
        const { [item.key]: _drop, ...rest } = prev;
        return rest;
      }
      if (singleSelect) return { [item.key]: item };
      if (Object.keys(prev).length >= cap) return prev;
      return { ...prev, [item.key]: item };
    });
  };

  const handleConfirm = () => {
    const items = Object.values(selected);
    if (items.length === 0) return;
    onConfirm(items);
    setSelected({});
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setSelected({});
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-2xl sm:max-w-[520px] sm:mx-auto sm:left-0 sm:right-0 h-[92vh] max-h-[92vh] flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-base">Acervo no Monetisexy</SheetTitle>
        </SheetHeader>


        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no acervo"
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Abas */}
        <div className="border-b">
          <div className="flex flex-wrap gap-x-1 gap-y-0 px-2">

            {FIXED_TABS.map((t) => {
              const isActive = activeTab.kind === "fixed" && activeTab.key === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab({ kind: "fixed", key: t.key })}
                  className={cn(
                    "px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px",
                    isActive
                      ? "border-primary text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
            {(categoriesQuery.data ?? []).map((c) => {
              const isActive = activeTab.kind === "category" && activeTab.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveTab({ kind: "category", id: c.id, name: c.name })}
                  className={cn(
                    "px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px",
                    isActive
                      ? "border-primary text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros de tipo */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b">
          {MEDIA_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Grid de itens */}
        <div className="flex-1 overflow-y-auto p-3">
          {itemsQuery.isLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhum item encontrado no seu acervo.
              </p>
              <Link
                to="/vault"
                onClick={() => handleOpenChange(false)}
                className="text-sm text-primary font-medium underline underline-offset-4"
              >
                Abrir Acervo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filteredItems.map((item) => {
                const isSelected = Boolean(selected[item.key]);
                const disabled =
                  !isSelected && !singleSelect && selectedCount >= cap;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggle(item)}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative aspect-square rounded-md overflow-hidden bg-muted group focus:outline-none focus:ring-2 focus:ring-primary",
                      disabled && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    {item.type === "video" ? (
                      <>
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.caption ?? ""}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <span
                      className={cn(
                        "absolute top-1.5 right-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-black/40 border-white/80 text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item.type === "gif" && (
                      <span className="absolute bottom-1 left-1 text-[10px] font-bold uppercase bg-black/60 text-white px-1 rounded">
                        GIF
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t p-3">
          <Button
            className="w-full rounded-md bg-gradient-to-r from-primary to-primary/80 hover:opacity-95 text-white font-semibold disabled:opacity-40 disabled:from-muted disabled:to-muted disabled:text-muted-foreground"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {singleSelect
              ? "Usar como prévia"
              : selectedCount === 0
                ? "Adicionar seleção"
                : `Adicionar ${selectedCount} ${selectedCount > 1 ? "itens" : "item"}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ChevronLeft,
  CheckSquare,
  Download,
  FileAudio,
  Film,
  FolderPlus,
  Image as ImageIcon,
  MoreVertical,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { supabase } from "@/integrations/supabase/client";
import {
  addItemsToCategory,
  createVaultCategory,
  createVaultUpload,
  deleteVaultCategory,
  deleteVaultUpload,
  getVaultCounts,
  listVaultCategories,
  listVaultCategoryItems,
  listVaultChatMedia,
  listVaultPublicationMedia,
  listVaultUploads,
  removeItemFromCategory,
  renameVaultCategory,
  type VaultCategory,
  type VaultMediaItem,
  type VaultMediaType,
} from "@/lib/vault.functions";

const BUCKET = "publications";
const SIGNED_URL_EXPIRES_IN = 60 * 60 * 24 * 365;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

type TimeRange = "all" | "specific";
type SortOrder = "recent" | "oldest";
type MediaFilter = "TODAS" | "FOTO" | "VÍDEO" | "ÁUDIO" | "GIF";

const MEDIA_FILTERS: MediaFilter[] = ["TODAS", "FOTO", "VÍDEO", "ÁUDIO", "GIF"];

type FixedTabKey = "todas" | "publicacoes" | "conversas" | "envios";
type ActiveTab = { kind: "fixed"; key: FixedTabKey } | { kind: "category"; id: string; name: string };

const FIXED_TABS: Array<{ key: FixedTabKey; label: string; title: string }> = [
  { key: "todas", label: "Todas as mídias", title: "TODAS AS MÍDIAS" },
  { key: "publicacoes", label: "Publicações", title: "PUBLICAÇÕES" },
  { key: "conversas", label: "Conversas", title: "CONVERSAS" },
  { key: "envios", label: "Envios", title: "ENVIOS" },
];

function filterToApi(f: MediaFilter): VaultMediaType | "all" {
  switch (f) {
    case "FOTO":
      return "image";
    case "VÍDEO":
      return "video";
    case "ÁUDIO":
      return "audio";
    case "GIF":
      return "gif";
    default:
      return "all";
  }
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Acervo · Monetisexy" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/entrar" });
  },
  component: VaultPage,
});

function VaultPage() {
  const router = useRouter();
  const qc = useQueryClient();

  // Server-fn bindings (bearer attaches via functionMiddleware)
  const fnCounts = useServerFn(getVaultCounts);
  const fnCategories = useServerFn(listVaultCategories);
  const fnPublications = useServerFn(listVaultPublicationMedia);
  const fnUploads = useServerFn(listVaultUploads);
  const fnChat = useServerFn(listVaultChatMedia);
  const fnCategoryItems = useServerFn(listVaultCategoryItems);
  const fnCreateCat = useServerFn(createVaultCategory);
  const fnRenameCat = useServerFn(renameVaultCategory);
  const fnDeleteCat = useServerFn(deleteVaultCategory);
  const fnAddToCat = useServerFn(addItemsToCategory);
  const fnRemoveFromCat = useServerFn(removeItemFromCategory);
  const fnCreateUpload = useServerFn(createVaultUpload);
  const fnDeleteUpload = useServerFn(deleteVaultUpload);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>({ kind: "fixed", key: "todas" });
  const [mobileDetail, setMobileDetail] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("TODAS");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [dialogView, setDialogView] = useState<"form" | "picker">("form");
  const [pickedItems, setPickedItems] = useState<VaultMediaItem[]>([]);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());

  const resetAddDialog = () => {
    setCategoryName("");
    setPickedItems([]);
    setPickerSelected(new Set());
    setDialogView("form");
  };

  const [sidebarSort, setSidebarSort] = useState<"padrao" | "nome" | "recentes" | "midias">("padrao");
  const [sidebarDirection, setSidebarDirection] = useState<"asc" | "desc">("asc");

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [pickCategoryOpen, setPickCategoryOpen] = useState(false);

  const [preview, setPreview] = useState<VaultMediaItem | null>(null);

  // Queries
  const countsQ = useQuery({
    queryKey: ["vault", "counts"],
    queryFn: () => fnCounts(),
  });
  const categoriesQ = useQuery({
    queryKey: ["vault", "categories"],
    queryFn: () => fnCategories(),
  });

  const mediaTypeArg = filterToApi(mediaFilter);
  const listArgs = { mediaType: mediaTypeArg, sort: sortOrder, limit: 300 } as const;

  const publicationsQ = useQuery({
    queryKey: ["vault", "publications", mediaTypeArg, sortOrder],
    queryFn: () => fnPublications({ data: listArgs }),
    enabled: activeTab.kind === "fixed" && (activeTab.key === "publicacoes" || activeTab.key === "todas"),
  });
  const uploadsQ = useQuery({
    queryKey: ["vault", "uploads", mediaTypeArg, sortOrder],
    queryFn: () => fnUploads({ data: listArgs }),
    enabled: activeTab.kind === "fixed" && (activeTab.key === "envios" || activeTab.key === "todas"),
  });
  const chatQ = useQuery({
    queryKey: ["vault", "chat"],
    queryFn: () => fnChat(),
    enabled: activeTab.kind === "fixed" && activeTab.key === "conversas",
  });
  const categoryItemsQ = useQuery({
    queryKey: ["vault", "category", activeTab.kind === "category" ? activeTab.id : null, mediaTypeArg, sortOrder],
    queryFn: () =>
      fnCategoryItems({
        data: {
          categoryId: activeTab.kind === "category" ? activeTab.id : "",
          mediaType: mediaTypeArg,
          sort: sortOrder,
        },
      }),
    enabled: activeTab.kind === "category",
  });

  // Picker: todas as mídias (publicações + envios) para o dialog de categoria
  const pickerMediaQ = useQuery({
    queryKey: ["vault", "picker", "all"],
    queryFn: async () => {
      const [pubs, ups] = await Promise.all([
        fnPublications({ data: { mediaType: "all", sort: "recent", limit: 300 } }),
        fnUploads({ data: { mediaType: "all", sort: "recent", limit: 300 } }),
      ]);
      return [...pubs, ...ups].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    enabled: addCategoryOpen && dialogView === "picker",
  });

  // Derive content list for current tab
  const content: { items: VaultMediaItem[]; loading: boolean } = (() => {
    if (activeTab.kind === "category") {
      return { items: categoryItemsQ.data ?? [], loading: categoryItemsQ.isLoading };
    }
    switch (activeTab.key) {
      case "publicacoes":
        return { items: publicationsQ.data ?? [], loading: publicationsQ.isLoading };
      case "envios":
        return { items: uploadsQ.data ?? [], loading: uploadsQ.isLoading };
      case "conversas":
        return { items: chatQ.data ?? [], loading: chatQ.isLoading };
      case "todas":
      default: {
        const merged = [...(publicationsQ.data ?? []), ...(uploadsQ.data ?? [])];
        merged.sort((a, b) => {
          const aT = new Date(a.createdAt).getTime();
          const bT = new Date(b.createdAt).getTime();
          return sortOrder === "recent" ? bT - aT : aT - bT;
        });
        return { items: merged, loading: publicationsQ.isLoading || uploadsQ.isLoading };
      }
    }
  })();

  const current = (() => {
    if (activeTab.kind === "category") {
      return { title: activeTab.name.toUpperCase(), isEmpty: false };
    }
    const meta = FIXED_TABS.find((t) => t.key === activeTab.key)!;
    return { title: meta.title, isEmpty: false };
  })();

  const selectTab = (t: ActiveTab) => {
    setActiveTab(t);
    setMobileDetail(true);
    setSelectionMode(false);
    setSelectedKeys(new Set());
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) closeSearch();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  // Sidebar entries: fixed + user categories, respect search + sort
  const sidebarCategories = useMemo(() => {
    const list = [...(categoriesQ.data ?? [])];
    list.sort((a, b) => {
      const dir = sidebarDirection === "asc" ? 1 : -1;
      if (sidebarSort === "nome") return a.name.localeCompare(b.name, "pt-BR") * dir;
      if (sidebarSort === "recentes")
        return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * dir;
      if (sidebarSort === "midias") return (b.itemCount - a.itemCount) * dir;
      return (a.position - b.position) * dir;
    });
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  }, [categoriesQ.data, sidebarSort, sidebarDirection, searchQuery]);

  const filteredFixedTabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FIXED_TABS;
    return FIXED_TABS.filter((t) => t.label.toLowerCase().includes(q));
  }, [searchQuery]);

  const counts = countsQ.data;

  // Mutations
  const createCatMut = useMutation({
    mutationFn: async ({
      name,
      items,
    }: {
      name: string;
      items: { source: "publication" | "upload"; id: string }[];
    }) => {
      const cat = await fnCreateCat({ data: { name } });
      if (items.length > 0) {
        await fnAddToCat({ data: { categoryId: cat.id, items } });
      }
      return cat;
    },
    onSuccess: () => {
      toast.success("Categoria criada");
      setAddCategoryOpen(false);
      resetAddDialog();
      qc.invalidateQueries({ queryKey: ["vault"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCatMut = useMutation({
    mutationFn: (id: string) => fnDeleteCat({ data: { id } }),
    onSuccess: () => {
      toast.success("Categoria excluída");
      qc.invalidateQueries({ queryKey: ["vault", "categories"] });
      setActiveTab({ kind: "fixed", key: "todas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameCatMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => fnRenameCat({ data: { id, name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault", "categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addToCatMut = useMutation({
    mutationFn: (payload: { categoryId: string; items: { source: "publication" | "upload"; id: string }[] }) =>
      fnAddToCat({ data: payload }),
    onSuccess: (_r, vars) => {
      toast.success("Adicionado à categoria");
      setSelectionMode(false);
      setSelectedKeys(new Set());
      setPickCategoryOpen(false);
      qc.invalidateQueries({ queryKey: ["vault", "categories"] });
      qc.invalidateQueries({ queryKey: ["vault", "category", vars.categoryId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeFromCatMut = useMutation({
    mutationFn: (itemId: string) => fnRemoveFromCat({ data: { itemId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUploadMut = useMutation({
    mutationFn: (id: string) => fnDeleteUpload({ data: { id } }),
    onSuccess: () => {
      toast.success("Envio excluído");
      qc.invalidateQueries({ queryKey: ["vault"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Uploads (Envios tab)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Sessão expirada.");

      for (const file of arr) {
        const type = classifyFile(file);
        if (!type) {
          toast.error(`Tipo não suportado: ${file.name}`);
          continue;
        }
        const limit =
          type === "video" ? MAX_VIDEO_BYTES : type === "audio" ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
        if (file.size > limit) {
          toast.error(`${file.name} excede o limite permitido.`);
          continue;
        }
        const id = crypto.randomUUID();
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `vault/${userId}/${id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) {
          toast.error(`Falha no upload de ${file.name}: ${upErr.message}`);
          continue;
        }
        const { data: signed, error: signErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, SIGNED_URL_EXPIRES_IN);
        if (signErr || !signed) {
          toast.error(`Falha ao gerar URL de ${file.name}`);
          await supabase.storage.from(BUCKET).remove([path]);
          continue;
        }
        try {
          await fnCreateUpload({
            data: {
              storagePath: path,
              url: signed.signedUrl,
              type,
              mime: file.type || null,
              sizeBytes: file.size,
            },
          });
        } catch (e) {
          await supabase.storage.from(BUCKET).remove([path]);
          toast.error(`Falha ao salvar ${file.name}: ${(e as Error).message}`);
          continue;
        }
      }
      qc.invalidateQueries({ queryKey: ["vault"] });
      toast.success("Envio concluído");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedItems = useMemo(
    () => content.items.filter((i) => selectedKeys.has(i.key)),
    [content.items, selectedKeys],
  );

  return (
    <div className="min-h-screen bg-background">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
        }}
      />

      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,360px)_1fr]">
          {/* Left header */}
          <div
            className={`${mobileDetail ? "hidden md:flex" : "flex"} items-center justify-between px-4 md:px-6 py-3 md:border-r md:border-border`}
          >
            <button
              type="button"
              onClick={() => router.history.back()}
              className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {searchOpen ? (
              <div className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={closeSearch}
                  className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Fechar busca"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="relative flex-1">
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar categoria"
                    className="h-10 pr-10 rounded-md border-2 border-primary bg-background text-foreground placeholder:text-muted-foreground"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold tracking-wide text-foreground">ACERVO</h1>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label="Buscar"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddCategoryOpen(true)}
                    className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label="Adicionar"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right header */}
          <div
            className={`${mobileDetail ? "flex" : "hidden md:flex"} items-center justify-between px-4 md:px-6 py-3`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileDetail(false)}
                className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold tracking-wide text-foreground truncate">
                {current.title}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {activeTab.kind === "fixed" && activeTab.key === "envios" && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-9 px-3 grid place-items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  <span className="flex items-center gap-1.5">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando..." : "Enviar"}
                  </span>
                </button>
              )}
              {content.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode((s) => !s);
                    setSelectedKeys(new Set());
                  }}
                  className={`h-9 w-9 grid place-items-center rounded-md border transition-colors ${
                    selectionMode
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  aria-label="Selecionar"
                >
                  <CheckSquare className="h-5 w-5" />
                </button>
              )}
              {activeTab.kind === "category" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      aria-label="Mais opções"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        const name = window.prompt("Novo nome da categoria", activeTab.name);
                        if (name && name.trim() && name !== activeTab.name) {
                          renameCatMut.mutate({ id: activeTab.id, name: name.trim() });
                          setActiveTab({ ...activeTab, name: name.trim() });
                        }
                      }}
                    >
                      Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (window.confirm(`Excluir a categoria "${activeTab.name}"?`)) {
                          deleteCatMut.mutate(activeTab.id);
                        }
                      }}
                    >
                      Excluir categoria
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Selection pill (floating bottom center) */}
      {selectionMode && selectedKeys.size > 0 && (
        <SelectionPill
          selectedCount={selectedKeys.size}
          totalCount={content.items.length}
          onClose={() => {
            setSelectionMode(false);
            setSelectedKeys(new Set());
          }}
          canDelete={
            (activeTab.kind === "fixed" && activeTab.key === "envios") ||
            activeTab.kind === "category"
          }
          onDelete={() => {
            if (activeTab.kind === "category") {
              selectedItems.forEach((it) => {
                if (it.joinId) removeFromCatMut.mutate(it.joinId);
              });
            } else if (activeTab.kind === "fixed" && activeTab.key === "envios") {
              if (!window.confirm(`Excluir ${selectedKeys.size} envio(s)?`)) return;
              selectedItems
                .filter((i) => i.source === "upload")
                .forEach((i) => deleteUploadMut.mutate(i.id));
            }
            setSelectionMode(false);
            setSelectedKeys(new Set());
          }}
          onDownload={() => {
            selectedItems.forEach((it, idx) => {
              setTimeout(() => {
                const a = document.createElement("a");
                a.href = it.url;
                a.download = it.storagePath?.split("/").pop() || `vault-${it.id}`;
                a.target = "_blank";
                a.rel = "noopener";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }, idx * 250);
            });
          }}
          onAddToCategory={() => setPickCategoryOpen(true)}
        />
      )}


      <main className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,360px)_1fr]">
        {/* Sidebar */}
        <aside
          className={`${mobileDetail ? "hidden md:block" : "block"} md:border-r md:border-border px-4 md:px-6 py-6`}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-sm font-bold tracking-wider text-muted-foreground">PADRÃO</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Ordenar"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 rounded-2xl p-2">
                <RadioRow label="Padrão" active={sidebarSort === "padrao"} onClick={() => setSidebarSort("padrao")} />
                <RadioRow label="Nome" active={sidebarSort === "nome"} onClick={() => setSidebarSort("nome")} />
                <RadioRow label="Recentes" active={sidebarSort === "recentes"} onClick={() => setSidebarSort("recentes")} />
                <RadioRow label="Mídias" active={sidebarSort === "midias"} onClick={() => setSidebarSort("midias")} />
                <div className="my-2 border-t border-border" />
                <RadioRow label="Ascendente" active={sidebarDirection === "asc"} onClick={() => setSidebarDirection("asc")} />
                <RadioRow label="Decrescente" active={sidebarDirection === "desc"} onClick={() => setSidebarDirection("desc")} />
              </PopoverContent>
            </Popover>
          </div>

          <ul className="space-y-1">
            {filteredFixedTabs.map((t) => {
              const isActive = activeTab.kind === "fixed" && activeTab.key === t.key;
              const count = counts
                ? t.key === "todas"
                  ? counts.all
                  : t.key === "publicacoes"
                  ? counts.publications
                  : t.key === "envios"
                  ? counts.uploads
                  : counts.chat
                : null;
              const previews = counts?.previews
                ? t.key === "todas"
                  ? counts.previews.all
                  : t.key === "publicacoes"
                  ? counts.previews.publications
                  : t.key === "envios"
                  ? counts.previews.uploads
                  : counts.previews.chat
                : [];
              return (
                <li key={t.key}>
                  <SidebarRow
                    label={t.label}
                    count={count}
                    subtitle={count === 0 ? "Vazio" : null}
                    active={isActive}
                    previewUrls={previews}
                    onClick={() => selectTab({ kind: "fixed", key: t.key })}
                  />
                </li>
              );
            })}

            {sidebarCategories.length > 0 && (
              <li className="pt-3 pb-1 px-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Suas categorias
              </li>
            )}
            {sidebarCategories.map((c) => {
              const isActive = activeTab.kind === "category" && activeTab.id === c.id;
              return (
                <li key={c.id}>
                  <SidebarRow
                    label={c.name}
                    count={c.itemCount}
                    subtitle={c.itemCount === 0 ? "Vazio" : null}
                    active={isActive}
                    previewUrls={c.previews}
                    onClick={() => selectTab({ kind: "category", id: c.id, name: c.name })}
                  />
                </li>
              );
            })}
          </ul>

        </aside>

        {/* Content */}
        <section className={`${mobileDetail ? "block" : "hidden md:block"} px-4 md:px-6 py-6`}>
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-bold tracking-wider text-muted-foreground">
              {sortOrder === "recent" ? "MAIS RECENTES" : "MAIS ANTIGAS"}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Ordenar"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 rounded-2xl p-2">
                <RadioRow label="Todo o tempo" active={timeRange === "all"} onClick={() => setTimeRange("all")} />
                <RadioRow label="Data específica" active={timeRange === "specific"} onClick={() => setTimeRange("specific")} />
                <div className="my-2 border-t border-border" />
                <RadioRow label="Mais recentes" active={sortOrder === "recent"} onClick={() => setSortOrder("recent")} />
                <RadioRow label="Mais antigas" active={sortOrder === "oldest"} onClick={() => setSortOrder("oldest")} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {MEDIA_FILTERS.map((f) => {
              const isActive = f === mediaFilter;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setMediaFilter(f)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold tracking-wide transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {content.loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Carregando…</div>
          ) : content.items.length === 0 ? (
            activeTab.kind === "fixed" && activeTab.key === "conversas" ? (
              <EmptyCategory message="Mídias das conversas em breve" />
            ) : activeTab.kind === "fixed" && activeTab.key === "envios" ? (
              <EnviosEmpty onUpload={() => fileInputRef.current?.click()} uploading={uploading} />
            ) : (
              <EmptyCategory message="Nenhuma mídia por aqui ainda." />
            )
          ) : (
            <MediaGrid
              items={content.items}
              selectionMode={selectionMode}
              selectedKeys={selectedKeys}
              onSelect={toggleSelect}
              onOpen={(it) => {
                if (selectionMode) toggleSelect(it.key);
                else setPreview(it);
              }}
            />
          )}
        </section>
      </main>

      {/* Add category dialog */}
      <Dialog
        open={addCategoryOpen}
        onOpenChange={(o) => {
          setAddCategoryOpen(o);
          if (!o) resetAddDialog();
        }}
      >
        <DialogContent className="sm:max-w-3xl rounded-3xl p-6 md:p-8 gap-0 [&>button]:hidden">
          <VisuallyHidden>
            <DialogTitle>Adicionar nova categoria</DialogTitle>
          </VisuallyHidden>

          {dialogView === "form" ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-base md:text-lg font-bold tracking-wider uppercase text-foreground">
                  Adicionar nova categoria
                </h2>
                <button
                  type="button"
                  onClick={() => setAddCategoryOpen(false)}
                  className="h-8 w-8 -mt-1 -mr-1 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 relative">
                <FolderPlus className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value.slice(0, 64))}
                  maxLength={64}
                  placeholder="Nome da categoria"
                  className="h-12 rounded-full pl-12 pr-20 text-base border-border/70"
                  autoFocus
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground tabular-nums pointer-events-none">
                  {categoryName.length} / 64
                </span>
              </div>

              <div className="mt-6 max-h-[420px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerSelected(new Set(pickedItems.map((i) => i.key)));
                      setDialogView("picker");
                    }}
                    className="aspect-square rounded-2xl bg-muted hover:bg-accent transition-colors grid place-items-center gap-2 text-foreground"
                  >
                    <Plus className="h-8 w-8" strokeWidth={2} />
                    <span className="text-sm md:text-base font-semibold">Adicionar mídia</span>
                  </button>

                  {pickedItems.map((it) => (
                    <div
                      key={it.key}
                      className="relative aspect-square overflow-hidden rounded-2xl bg-muted"
                    >
                      <MediaThumb item={it} />
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                        {it.type === "video" && (
                          <span className="h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white">
                            <Play className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {it.type === "audio" && (
                          <span className="h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white">
                            <FileAudio className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {it.type === "gif" && (
                          <span className="px-1.5 h-6 grid place-items-center rounded-md bg-black/60 text-white text-[10px] font-bold">
                            GIF
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPickedItems((prev) => prev.filter((p) => p.key !== it.key))
                        }
                        aria-label="Remover"
                        className="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={!categoryName.trim() || createCatMut.isPending}
                  onClick={() =>
                    createCatMut.mutate({
                      name: categoryName.trim(),
                      items: pickedItems.map((i) => ({ source: i.source, id: i.id })),
                    })
                  }
                  className="h-11 px-8 rounded-full border-2 border-border text-muted-foreground font-semibold transition-colors enabled:bg-primary enabled:text-primary-foreground enabled:border-primary enabled:hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createCatMut.isPending ? "Criando…" : "Confirmar"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddCategoryOpen(false)}
                  className="h-11 px-8 rounded-full border-2 border-foreground/80 text-foreground font-semibold hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerSelected(new Set());
                      setDialogView("form");
                    }}
                    aria-label="Voltar"
                    className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h2 className="text-base md:text-lg font-bold tracking-wider uppercase text-foreground">
                    Selecionar mídias
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAddCategoryOpen(false)}
                  aria-label="Fechar"
                  className="h-8 w-8 grid place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
                {pickerMediaQ.isLoading ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">Carregando…</div>
                ) : (pickerMediaQ.data ?? []).length === 0 ? (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    Nenhuma mídia disponível.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {(pickerMediaQ.data ?? []).map((it) => {
                      const selected = pickerSelected.has(it.key);
                      return (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() =>
                            setPickerSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(it.key)) next.delete(it.key);
                              else next.add(it.key);
                              return next;
                            })
                          }
                          className={`relative aspect-square overflow-hidden rounded-lg bg-muted ${
                            selected ? "ring-2 ring-primary" : ""
                          }`}
                        >
                          <MediaThumb item={it} />
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                            {it.type === "video" && (
                              <span className="h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white">
                                <Play className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {it.type === "audio" && (
                              <span className="h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white">
                                <FileAudio className="h-3.5 w-3.5" />
                              </span>
                            )}
                            {it.type === "gif" && (
                              <span className="px-1.5 h-6 grid place-items-center rounded-md bg-black/60 text-white text-[10px] font-bold">
                                GIF
                              </span>
                            )}
                          </div>
                          <span
                            className={`absolute top-1.5 right-1.5 h-6 w-6 grid place-items-center rounded-full border-2 ${
                              selected
                                ? "border-primary bg-primary"
                                : "border-white bg-black/40"
                            }`}
                          >
                            {selected && (
                              <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPickerSelected(new Set());
                    setDialogView("form");
                  }}
                  className="h-11 px-6 rounded-full border-2 border-foreground/80 text-foreground font-semibold hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const all = pickerMediaQ.data ?? [];
                    const byKey = new Map(all.map((i) => [i.key, i]));
                    const merged: VaultMediaItem[] = [];
                    const seen = new Set<string>();
                    for (const it of pickedItems) {
                      if (pickerSelected.has(it.key) && !seen.has(it.key)) {
                        merged.push(it);
                        seen.add(it.key);
                      }
                    }
                    for (const k of pickerSelected) {
                      if (!seen.has(k)) {
                        const it = byKey.get(k);
                        if (it) {
                          merged.push(it);
                          seen.add(k);
                        }
                      }
                    }
                    setPickedItems(merged);
                    setDialogView("form");
                  }}
                  className="h-11 px-8 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  Concluído{pickerSelected.size > 0 ? ` (${pickerSelected.size})` : ""}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* Pick category for selected items */}
      <Dialog open={pickCategoryOpen} onOpenChange={setPickCategoryOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogTitle className="text-lg font-bold tracking-wide uppercase text-foreground">
            Adicionar a uma categoria
          </DialogTitle>
          <div className="mt-4 max-h-72 overflow-y-auto space-y-1">
            {(categoriesQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Crie uma categoria primeiro no botão + do topo.
              </p>
            ) : (
              (categoriesQ.data ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={addToCatMut.isPending}
                  onClick={() =>
                    addToCatMut.mutate({
                      categoryId: c.id,
                      items: selectedItems.map((i) => ({ source: i.source, id: i.id })),
                    })
                  }
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.itemCount}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview lightbox */}
      <PreviewDialog item={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function SelectionPill({
  selectedCount,
  totalCount,
  canDelete,
  onClose,
  onDelete,
  onDownload,
  onAddToCategory,
}: {
  selectedCount: number;
  totalCount: number;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onAddToCategory: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full bg-neutral-800 text-white shadow-2xl px-2 py-2">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar seleção"
        className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
      <span className="px-3 text-sm font-medium whitespace-nowrap">
        {selectedCount} / {totalCount} selecionado
      </span>
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        aria-label="Excluir"
        title={canDelete ? "Excluir selecionados" : "Só é possível excluir na aba Envios ou em Categorias"}
        className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onDownload}
        aria-label="Baixar"
        title="Baixar selecionados"
        className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10 transition-colors"
      >
        <Download className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onAddToCategory}
        className="ml-1 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Adicionar à categoria
      </button>
    </div>
  );
}


function SidebarRow({
  label,
  count,
  subtitle,
  active,
  previewUrls,
  onClick,
}: {
  label: string;
  count: number | null;
  subtitle: string | null;
  active: boolean;
  previewUrls?: string[];
  onClick: () => void;
}) {
  const previews = (previewUrls ?? []).slice(0, 3);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
        active ? "bg-primary/10 text-foreground" : "hover:bg-accent text-foreground"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold truncate">{label}</p>
        {count != null && count > 0 ? (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            <span>{count}</span>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? "Vazio"}</p>
        )}
      </div>
      {previews.length > 0 && (
        <div className="relative shrink-0 h-12 w-[72px]">
          {previews.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="absolute top-0 h-12 w-12 overflow-hidden rounded-md ring-2 ring-background bg-muted"
              style={{ left: `${i * 12}px`, zIndex: i + 1 }}
            >
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </button>
  );
}


function MediaGrid({
  items,
  selectionMode,
  selectedKeys,
  onSelect,
  onOpen,
}: {
  items: VaultMediaItem[];
  selectionMode: boolean;
  selectedKeys: Set<string>;
  onSelect: (key: string) => void;
  onOpen: (item: VaultMediaItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {items.map((it) => {
        const selected = selectedKeys.has(it.key);
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onOpen(it)}
            className={`relative aspect-square overflow-hidden rounded-lg bg-muted group ${
              selected ? "ring-2 ring-primary" : ""
            }`}
          >
            <MediaThumb item={it} />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
              {it.type === "video" && (
                <span className="h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white">
                  <Play className="h-3.5 w-3.5" />
                </span>
              )}
              {it.type === "audio" && (
                <span className="h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white">
                  <FileAudio className="h-3.5 w-3.5" />
                </span>
              )}
              {it.type === "gif" && (
                <span className="px-1.5 h-6 grid place-items-center rounded-md bg-black/60 text-white text-[10px] font-bold">
                  GIF
                </span>
              )}
            </div>
            {selectionMode && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(it.key);
                }}
                className={`absolute top-1.5 right-1.5 h-6 w-6 grid place-items-center rounded-full border-2 ${
                  selected ? "border-primary bg-primary" : "border-white bg-black/40"
                }`}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
              </span>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-1.5 text-[10px] font-medium text-white bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              {dateFmt.format(new Date(it.createdAt))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MediaThumb({ item }: { item: VaultMediaItem }) {
  if (item.type === "image" || item.type === "gif") {
    return (
      <img
        src={item.url}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }
  if (item.type === "video") {
    return (
      <video
        src={item.url}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
    );
  }
  // audio
  return (
    <div className="h-full w-full grid place-items-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
      <FileAudio className="h-10 w-10" />
    </div>
  );
}

function EmptyCategory({ message }: { message: string }) {
  return (
    <div className="min-h-[420px] grid place-items-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground/70">
        <svg width="180" height="150" viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect x="20" y="30" width="90" height="70" rx="8" fill="currentColor" opacity="0.25" />
          <circle cx="45" cy="55" r="8" fill="currentColor" opacity="0.5" />
          <path d="M25 95 L55 70 L85 90 L105 78 L105 100 L25 100 Z" fill="currentColor" opacity="0.5" />
          <rect x="95" y="15" width="70" height="55" rx="8" fill="currentColor" opacity="0.2" />
          <circle cx="145" cy="42" r="4" fill="currentColor" opacity="0.55" />
          <rect x="80" y="70" width="75" height="60" rx="8" fill="currentColor" opacity="0.3" />
          <path d="M110 95 L135 108 L110 121 Z" fill="currentColor" opacity="0.55" />
        </svg>
        <p className="text-base">{message}</p>
      </div>
    </div>
  );
}

function EnviosEmpty({ onUpload, uploading }: { onUpload: () => void; uploading: boolean }) {
  return (
    <div className="min-h-[420px] grid place-items-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Film className="h-16 w-16 text-muted-foreground/40" />
        <p className="text-base">Nenhum envio na sua biblioteca ainda.</p>
        <button
          type="button"
          disabled={uploading}
          onClick={onUpload}
          className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando..." : "Enviar arquivos"}
        </button>
      </div>
    </div>
  );
}

function PreviewDialog({ item, onClose }: { item: VaultMediaItem | null; onClose: () => void }) {
  const open = item !== null;
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent className="max-w-3xl p-0 bg-black border-none">
        <VisuallyHidden>
          <DialogTitle>Preview de mídia</DialogTitle>
        </VisuallyHidden>
        {item && (
          <div className="w-full max-h-[80vh] grid place-items-center">
            {item.type === "video" ? (
              <video src={item.url} controls autoPlay className="max-h-[80vh] w-full" />
            ) : item.type === "audio" ? (
              <div className="p-12 w-full">
                <audio src={item.url} controls className="w-full" />
              </div>
            ) : (
              <img src={item.url} alt="" className="max-h-[80vh] w-auto" />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RadioRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-accent transition-colors text-left"
    >
      <span
        className={`h-5 w-5 rounded-full grid place-items-center border-2 ${
          active ? "border-primary bg-primary" : "border-muted-foreground/40"
        }`}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
      </span>
      <span className="text-base font-semibold text-foreground">{label}</span>
    </button>
  );
}

function classifyFile(file: File): VaultMediaType | null {
  const mime = file.type;
  const name = file.name.toLowerCase();
  if (mime === "image/gif" || name.endsWith(".gif")) return "gif";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Types ----------
export type VaultMediaType = "image" | "video" | "audio" | "gif";
export type VaultItemSource = "publication" | "upload";

export type VaultMediaItem = {
  key: string; // stable client key = `${source}:${id}`
  source: VaultItemSource;
  id: string; // publication_media.id OR vault_uploads.id
  joinId?: string | null; // vault_category_items.id when listed from a category
  publicationId: string | null;
  type: VaultMediaType;
  url: string;
  storagePath: string;
  createdAt: string;
  caption?: string | null;
  mime?: string | null;
  durationSeconds?: number | null;
};

export type VaultCategory = {
  id: string;
  name: string;
  position: number;
  itemCount: number;
  previews: string[];
  createdAt: string;
  updatedAt: string;
};


// ---------- Helpers ----------
const mediaTypeSchema = z.enum(["all", "image", "video", "audio", "gif"]);
const sortSchema = z.enum(["recent", "oldest"]).default("recent");

function applyTypeFilter<T extends { type: VaultMediaType }>(items: T[], mediaType: string) {
  if (mediaType === "all") return items;
  return items.filter((i) => i.type === mediaType);
}

// ---------- Publications: list current user's media ----------
const listArgs = z.object({
  mediaType: mediaTypeSchema.default("all"),
  sort: sortSchema,
  limit: z.number().int().min(1).max(500).default(200),
});

export const listVaultPublicationMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listArgs.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const ascending = data.sort === "oldest";
    const { data: pubs, error } = await context.supabase
      .from("publications")
      .select(
        "id, caption, created_at, published_at, audio_url, audio_storage_path, publication_media(id, url, storage_path, type, position, created_at)",
      )
      .eq("author_id", context.userId)
      .is("archived_at", null)
      .order("published_at", { ascending, nullsFirst: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const items: VaultMediaItem[] = [];
    for (const p of pubs ?? []) {
      const pub = p as unknown as {
        id: string;
        caption: string | null;
        created_at: string;
        published_at: string | null;
        audio_url: string | null;
        audio_storage_path: string | null;
        publication_media: Array<{ id: string; url: string; storage_path: string; type: string; position: number; created_at: string }>;
      };
      const medias = pub.publication_media ?? [];
      const ordered = [...medias].sort((a, b) => a.position - b.position);
      for (const m of ordered) {
        const t: VaultMediaType =
          m.type === "video" ? "video"
          : m.type === "audio" ? "audio"
          : m.type === "gif" ? "gif"
          : "image";
        items.push({
          key: `publication:${m.id}`,
          source: "publication",
          id: m.id,
          publicationId: pub.id,
          type: t,
          url: m.url,
          storagePath: m.storage_path,
          createdAt: m.created_at,
          caption: pub.caption,
        });
      }
      if (pub.audio_url) {
        items.push({
          key: `publication-audio:${pub.id}`,
          source: "publication",
          id: `audio:${pub.id}`,
          publicationId: pub.id,
          type: "audio",
          url: pub.audio_url,
          storagePath: pub.audio_storage_path ?? "",
          createdAt: pub.published_at ?? pub.created_at,
          caption: pub.caption,
        });
      }
    }
    return applyTypeFilter(items, data.mediaType);

  });

// ---------- Uploads: standalone user library ----------
export const listVaultUploads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listArgs.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const ascending = data.sort === "oldest";
    const { data: rows, error } = await context.supabase
      .from("vault_uploads")
      .select("id, url, storage_path, type, mime, duration_seconds, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const items: VaultMediaItem[] = (rows ?? []).map((r) => ({
      key: `upload:${r.id}`,
      source: "upload" as const,
      id: r.id,
      publicationId: null,
      type: r.type as VaultMediaType,
      url: r.url,
      storagePath: r.storage_path,
      createdAt: r.created_at,
      mime: r.mime ?? null,
      durationSeconds: r.duration_seconds ?? null,
    }));
    return applyTypeFilter(items, data.mediaType);
  });

// ---------- Chat media (placeholder) ----------
// chat_messages has no attachment column yet, so this returns [].
export const listVaultChatMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => [] as VaultMediaItem[]);

// ---------- Counts for sidebar ----------
export const getVaultCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ count: pubMediaCount }, { count: uploadsCount }, pubMediaPrev, pubAudioPrev, uploadsPrev] = await Promise.all([
      context.supabase
        .from("publication_media")
        .select("id, publications!inner(author_id, archived_at)", { count: "exact", head: true })
        .eq("publications.author_id", context.userId)
        .is("publications.archived_at", null),
      context.supabase
        .from("vault_uploads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
      context.supabase
        .from("publication_media")
        .select("url, created_at, publications!inner(author_id, archived_at)")
        .eq("publications.author_id", context.userId)
        .is("publications.archived_at", null)
        .order("created_at", { ascending: false })
        .limit(6),
      context.supabase
        .from("publications")
        .select("preview_url, audio_url, published_at")
        .eq("author_id", context.userId)
        .is("archived_at", null)
        .not("audio_url", "is", null)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(3),
      context.supabase
        .from("vault_uploads")
        .select("url, created_at, type")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const publications = pubMediaCount ?? 0;
    const uploads = uploadsCount ?? 0;

    const pubPreviews = (pubMediaPrev.data ?? []).map((r) => r.url as string).slice(0, 3);
    const audioCovers = (pubAudioPrev.data ?? [])
      .map((r) => (r.preview_url ?? null) as string | null)
      .filter((u): u is string => !!u);
    const uploadPreviews = (uploadsPrev.data ?? [])
      .filter((r) => r.type !== "audio")
      .map((r) => r.url as string)
      .slice(0, 3);

    const allPreviews = [...pubPreviews, ...uploadPreviews].slice(0, 3);

    return {
      publications,
      uploads,
      chat: 0,
      all: publications + uploads,
      previews: {
        all: allPreviews,
        publications: [...pubPreviews, ...audioCovers].slice(0, 3),
        uploads: uploadPreviews,
        chat: [] as string[],
      },
    };
  });


// ---------- Categories ----------
export const listVaultCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: cats, error } = await context.supabase
      .from("vault_categories")
      .select("id, name, position, created_at, updated_at")
      .eq("user_id", context.userId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (cats ?? []).map((c) => c.id);
    const counts = new Map<string, number>();
    const previews = new Map<string, string[]>();
    if (ids.length > 0) {
      const { data: items, error: itemsErr } = await context.supabase
        .from("vault_category_items")
        .select(
          `category_id, source, created_at,
           publication_media:publication_media_id(url, type),
           vault_upload:vault_upload_id(url, type)`,
        )
        .in("category_id", ids)
        .order("created_at", { ascending: false });
      if (itemsErr) throw new Error(itemsErr.message);
      for (const row of items ?? []) {
        counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
        const list = previews.get(row.category_id) ?? [];
        if (list.length >= 3) continue;
        const pm = (row as unknown as { publication_media: { url: string; type: string } | null }).publication_media;
        const up = (row as unknown as { vault_upload: { url: string; type: string } | null }).vault_upload;
        const url = pm?.type !== "audio" ? pm?.url : null;
        const upUrl = up?.type !== "audio" ? up?.url : null;
        const chosen = url ?? upUrl ?? null;
        if (chosen) {
          list.push(chosen);
          previews.set(row.category_id, list);
        }
      }
    }

    const result: VaultCategory[] = (cats ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      position: c.position,
      itemCount: counts.get(c.id) ?? 0,
      previews: previews.get(c.id) ?? [],
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
    return result;
  });


const createCategorySchema = z.object({ name: z.string().trim().min(1).max(60) });

export const createVaultCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createCategorySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: last } = await context.supabase
      .from("vault_categories")
      .select("position")
      .eq("user_id", context.userId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (last?.position ?? -1) + 1;
    const { data: row, error } = await context.supabase
      .from("vault_categories")
      .insert({ user_id: context.userId, name: data.name, position: nextPos })
      .select("id, name, position, created_at, updated_at")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe uma categoria com esse nome.");
      throw new Error(error.message);
    }
    return row;
  });

const renameCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
});

export const renameVaultCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => renameCategorySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vault_categories")
      .update({ name: data.name })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true } as const;
  });

const deleteCategorySchema = z.object({ id: z.string().uuid() });

export const deleteVaultCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteCategorySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vault_categories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true } as const;
  });

// ---------- Category items ----------
const listItemsSchema = z.object({
  categoryId: z.string().uuid(),
  mediaType: mediaTypeSchema.default("all"),
  sort: sortSchema,
});

export const listVaultCategoryItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listItemsSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Ownership enforced by RLS on vault_categories/vault_category_items.
    const ascending = data.sort === "oldest";
    const { data: rows, error } = await context.supabase
      .from("vault_category_items")
      .select(
        `id, source, publication_media_id, vault_upload_id, position, created_at,
         publication_media:publication_media_id(id, url, storage_path, type, publication_id, created_at, publications:publication_id(id, caption)),
         vault_upload:vault_upload_id(id, url, storage_path, type, mime, duration_seconds, created_at)`,
      )
      .eq("category_id", data.categoryId)
      .order("created_at", { ascending });
    if (error) throw new Error(error.message);

    const items: VaultMediaItem[] = [];
    for (const row of rows ?? []) {
      if (row.source === "publication" && row.publication_media) {
        const pm = row.publication_media as unknown as {
          id: string; url: string; storage_path: string; type: string; publication_id: string; created_at: string; publications: { id: string; caption: string | null } | null;
        };
        items.push({
          key: `publication:${pm.id}`,
          source: "publication",
          id: pm.id,
          joinId: row.id,
          publicationId: pm.publication_id,
          type: pm.type === "video" ? "video" : "image",
          url: pm.url,
          storagePath: pm.storage_path,
          createdAt: pm.created_at,
          caption: pm.publications?.caption ?? null,
        });
      } else if (row.source === "upload" && row.vault_upload) {
        const up = row.vault_upload as unknown as {
          id: string; url: string; storage_path: string; type: string; mime: string | null; duration_seconds: number | null; created_at: string;
        };
        items.push({
          key: `upload:${up.id}`,
          source: "upload",
          id: up.id,
          joinId: row.id,
          publicationId: null,
          type: up.type as VaultMediaType,
          url: up.url,
          storagePath: up.storage_path,
          createdAt: up.created_at,
          mime: up.mime,
          durationSeconds: up.duration_seconds,
        });
      }
    }
    return applyTypeFilter(items, data.mediaType);
  });

const addItemsSchema = z.object({
  categoryId: z.string().uuid(),
  items: z
    .array(
      z.object({
        source: z.enum(["publication", "upload"]),
        id: z.string().uuid(),
      }),
    )
    .min(1)
    .max(200),
});

export const addItemsToCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addItemsSchema.parse(d))
  .handler(async ({ data, context }) => {
    // RLS on vault_category_items enforces category ownership.
    const rows = data.items.map((it) => ({
      category_id: data.categoryId,
      source: it.source,
      publication_media_id: it.source === "publication" ? it.id : null,
      vault_upload_id: it.source === "upload" ? it.id : null,
    }));
    const { error } = await context.supabase
      .from("vault_category_items")
      .upsert(rows, {
        onConflict: "category_id,publication_media_id",
        ignoreDuplicates: true,
      });
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    return { ok: true, added: rows.length } as const;
  });

const removeItemSchema = z.object({ itemId: z.string().uuid() });
export const removeItemFromCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => removeItemSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vault_category_items")
      .delete()
      .eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return { ok: true } as const;
  });

// ---------- Uploads (create/delete metadata) ----------
const createUploadSchema = z.object({
  storagePath: z.string().min(1),
  url: z.string().url(),
  type: z.enum(["image", "video", "audio", "gif"]),
  mime: z.string().optional().nullable(),
  sizeBytes: z.number().int().min(0).optional().nullable(),
  width: z.number().int().min(0).optional().nullable(),
  height: z.number().int().min(0).optional().nullable(),
  durationSeconds: z.number().min(0).optional().nullable(),
});

export const createVaultUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createUploadSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Enforce that the storage path lives under the caller's vault/<uid>/ prefix.
    const expectedPrefix = `vault/${context.userId}/`;
    if (!data.storagePath.startsWith(expectedPrefix)) {
      throw new Error("Caminho de armazenamento inválido");
    }
    const { data: row, error } = await context.supabase
      .from("vault_uploads")
      .insert({
        user_id: context.userId,
        storage_path: data.storagePath,
        url: data.url,
        type: data.type,
        mime: data.mime ?? null,
        size_bytes: data.sizeBytes ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        duration_seconds: data.durationSeconds ?? null,
      })
      .select("id, url, storage_path, type, mime, duration_seconds, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const deleteUploadSchema = z.object({ id: z.string().uuid() });
export const deleteVaultUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteUploadSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Fetch storage path for cleanup
    const { data: row, error: getErr } = await context.supabase
      .from("vault_uploads")
      .select("storage_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!row) return { ok: true } as const;

    // Try to remove the physical file (RLS on storage.objects allows owner)
    await context.supabase.storage.from("publications").remove([row.storage_path]);

    const { error } = await context.supabase
      .from("vault_uploads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true } as const;
  });

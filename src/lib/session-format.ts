export type UAInfo = {
  browser: string;
  os: string;
  kind: "mobile" | "tablet" | "desktop";
};

export function parseUA(ua: string | null): UAInfo {
  if (!ua) return { browser: "Desconhecido", os: "—", kind: "desktop" };
  const s = ua;
  let browser = "Outro";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Chrome\//.test(s) && !/Edg\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s) && !/Chrome\//.test(s)) browser = "Safari";

  let os = "—";
  if (/Windows NT/.test(s)) os = "Windows";
  else if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Mac OS X|Macintosh/.test(s)) os = "macOS";
  else if (/Linux/.test(s)) os = "Linux";

  const isTablet = /iPad|Tablet/.test(s);
  const isMobile = /Mobi|iPhone|Android.*Mobile/.test(s);
  const kind: UAInfo["kind"] = isTablet
    ? "tablet"
    : isMobile
      ? "mobile"
      : "desktop";
  return { browser, os, kind };
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

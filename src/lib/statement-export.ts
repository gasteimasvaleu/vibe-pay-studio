// Geração client-side do extrato do creator (CSV e PDF).
// Os dados vêm da lista já carregada na tela — nada de servidor aqui.

export interface StatementRow {
  id: string;
  kind: string;
  status: string;
  amount_cents_gross: number | null;
  platform_fee_cents: number | null;
  net_cents: number | null;
  payment_method: string | null;
  is_international: boolean | null;
  created_at: string | null;
  hidden?: boolean;
}

const brl = (cents: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (cents ?? 0) / 100,
  );

const dateFmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "";

const STATUS_LABEL: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  refused: "Negado",
  refunded: "Devolvido",
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}

function visibleRows(rows: StatementRow[]) {
  return rows.filter((r) => !r.hidden);
}

export function buildStatementCsv(
  rows: StatementRow[],
  kindLabel: (kind: string) => string,
  paymentLabel: (method: string | null) => string,
): Blob {
  const data = visibleRows(rows);
  const header = [
    "Data",
    "Tipo",
    "Status",
    "Pagamento",
    "Origem",
    "Bruto",
    "Comissão plataforma",
    "Líquido",
  ];
  const lines = data.map((r) =>
    [
      dateFmt(r.created_at),
      kindLabel(r.kind),
      STATUS_LABEL[r.status] ?? r.status,
      paymentLabel(r.payment_method),
      r.is_international ? "Internacional" : "Nacional",
      brl(r.amount_cents_gross),
      brl(r.platform_fee_cents),
      brl(r.net_cents),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  // BOM UTF-8 para o Excel reconhecer acentos; ";" separa colunas no Excel pt-BR.
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}

export async function buildStatementPdf(
  rows: StatementRow[],
  kindLabel: (kind: string) => string,
  paymentLabel: (method: string | null) => string,
): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const data = visibleRows(rows);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const purple = rgb(0.49, 0.23, 0.93);
  const gray = rgb(0.42, 0.45, 0.5);
  const black = rgb(0.12, 0.12, 0.14);

  const gross = data.reduce((s, r) => s + (r.amount_cents_gross ?? 0), 0);
  const fees = data.reduce((s, r) => s + (r.platform_fee_cents ?? 0), 0);
  const net = data.reduce((s, r) => s + (r.net_cents ?? 0), 0);

  const M = 48;
  const ROW_H = 22;
  let page = doc.addPage([595, 842]);
  let y = 800;

  const newPage = () => {
    page = doc.addPage([595, 842]);
    y = 800;
  };

  page.drawText("Monetisexy — Extrato de rendimentos", {
    x: M,
    y,
    size: 16,
    font: bold,
    color: purple,
  });
  y -= 20;
  page.drawText(`Gerado em ${dateFmt(new Date().toISOString())}`, {
    x: M,
    y,
    size: 9,
    font,
    color: gray,
  });
  y -= 24;
  page.drawText(
    `Total bruto: ${brl(gross)}   Comissões: ${brl(fees)}   Líquido: ${brl(net)}`,
    { x: M, y, size: 11, font: bold, color: black },
  );
  y -= 28;

  const cols = [
    { label: "Data", x: M, w: 92 },
    { label: "Tipo", x: M + 92, w: 130 },
    { label: "Status", x: M + 222, w: 60 },
    { label: "Pagamento", x: M + 282, w: 70 },
    { label: "Bruto", x: M + 352, w: 65 },
    { label: "Líquido", x: M + 417, w: 65 },
  ];
  const drawHeader = () => {
    cols.forEach((c) =>
      page.drawText(c.label, { x: c.x, y, size: 8, font: bold, color: gray }),
    );
    y -= ROW_H;
  };
  drawHeader();

  const clip = (s: string, max: number) =>
    s.length > max ? s.slice(0, max - 1) + "…" : s;

  for (const r of data) {
    if (y < 60) {
      newPage();
      drawHeader();
    }
    const values = [
      dateFmt(r.created_at),
      clip(kindLabel(r.kind), 22),
      STATUS_LABEL[r.status] ?? r.status,
      paymentLabel(r.payment_method),
      brl(r.amount_cents_gross),
      brl(r.net_cents),
    ];
    values.forEach((v, i) =>
      page.drawText(v, { x: cols[i].x, y, size: 8, font, color: black }),
    );
    y -= ROW_H;
  }

  if (data.length === 0) {
    page.drawText("Nenhuma movimentação no período.", {
      x: M,
      y,
      size: 10,
      font,
      color: gray,
    });
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

import { CATEGORY_MAP } from "@/models/categories";
import type { Purchase } from "@/models/types";
import {
  SAVINGS_INITIAL,
  BASE_URL,
  NOTIFICATION_LOCALE,
  META_APP,
} from "@/config/variables";
import { computeCycleStats } from "@/helpers/stats";
import { toPurchases } from "@/helpers/purchaseTransformer";
import { formatShortIDR } from "@/utils/currency";
import {
  getCurrentCycle,
  shiftCycle,
} from "@/utils/cycleUtils";
import { getPurchasesInRange } from "@/services/budgetService";

/** Nama aplikasi untuk header/tanda tangan email (fallback bila env kosong). */
const APP_NAME = META_APP ?? "Savings Goal Tracker";

/**
 * Builder payload notifikasi (web push + email).
 *
 * Konten dilokalkan sesuai env `NOTIFICATION_LOCALE` (id | en).
 * Setiap cron memilih channel yang relevan:
 * - daily-reminder → web push saja.
 * - weekly-summary → email saja.
 */

/** Pilih teks sesuai locale notifikasi. */
function L(id: string, en: string): string {
  return NOTIFICATION_LOCALE === "en" ? en : id;
}

export interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  /** Versi HTML email kaya (kartu). Hanya untuk channel email (weekly-summary). */
  html?: string;
  /** Preheader email (preview text di inbox). */
  previewText?: string;
  /** Ikon push notification (path absolut, mis. "/android/launchericon-192x192.png"). */
  icon?: string;
  /** Badge push notification (path absolut). */
  badge?: string;
}

/** Ikon & badge push default (launcher icon resolusi tinggi). */
const PUSH_ICON = "/android/launchericon-192x192.png";
const PUSH_BADGE = "/android/launchericon-96x96.png";

/** Cek apakah sebuah pembelian terjadi hari ini (lokal). */
function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Bangun payload notifikasi harian: pengingat catat pengeluaran + insight siklus.
 * Mengambil data siklus saat ini dan menampilkan progres pengeluaran vs limit.
 */
export async function buildDailyNotification(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  const records = await getPurchasesInRange(cycle.startDate, cycle.endDate);
  const purchases = toPurchases(records);
  const stats = computeCycleStats(purchases);

  const todayPurchases = purchases.filter((p) => isToday(p.date));
  const todaySpent = todayPurchases.reduce((acc, p) => acc + p.amount, 0);

  let body: string;

  if (stats.overLimit) {
    // Sudah melebihi limit pengeluaran
    body = L(
      `Limit siklus ${cycle.label} terlampaui! Terpakai ${stats.limitPercent}% (${formatShortIDR(stats.allocatedSpent)} dari ${formatShortIDR(stats.spendingLimit)}).`,
      `${cycle.label} cycle limit exceeded! Used ${stats.limitPercent}% (${formatShortIDR(stats.allocatedSpent)} of ${formatShortIDR(stats.spendingLimit)}).`,
    );
  } else if (stats.limitPercent >= 80) {
    // Mendekati limit (>= 80%)
    const tail =
      todayPurchases.length > 0
        ? L(
            `Hari ini: ${formatShortIDR(todaySpent)}.`,
            `Today: ${formatShortIDR(todaySpent)}.`,
          )
        : L(
            "Belum ada pengeluaran hari ini.",
            "No spending recorded today.",
          );
    body = L(
      `Hati-hati, pengeluaran ${stats.limitPercent}% dari limit. Sisa ${formatShortIDR(stats.limitRemaining)}. ${tail}`,
      `Careful, spending at ${stats.limitPercent}% of limit. ${formatShortIDR(stats.limitRemaining)} left. ${tail}`,
    );
  } else if (todayPurchases.length > 0) {
    // Ada pengeluaran hari ini
    const topCat = getTopCategory(todayPurchases);
    body = L(
      `Hari ini belanja ${formatShortIDR(todaySpent)}${topCat ? ` (${topCat})` : ""}. Total siklus: ${formatShortIDR(stats.totalSpent)}, sisa limit ${formatShortIDR(stats.limitRemaining)}.`,
      `Spent ${formatShortIDR(todaySpent)} today${topCat ? ` (${topCat})` : ""}. Cycle total: ${formatShortIDR(stats.totalSpent)}, ${formatShortIDR(stats.limitRemaining)} limit left.`,
    );
  } else {
    // Belum ada pengeluaran hari ini
    body = L(
      `Belum ada pengeluaran tercatat hari ini. Total siklus ${cycle.label}: ${formatShortIDR(stats.totalSpent)} dari ${formatShortIDR(stats.spendingLimit)}.`,
      `No spending recorded today. ${cycle.label} cycle total: ${formatShortIDR(stats.totalSpent)} of ${formatShortIDR(stats.spendingLimit)}.`,
    );
  }

  return {
    title: L(
      `Pengingat Tabungan - ${cycle.label}`,
      `Savings Reminder - ${cycle.label}`,
    ),
    body,
    tag: "daily-reminder",
    url: "/",
    icon: PUSH_ICON,
    badge: PUSH_BADGE,
  };
}

/**
 * Bangun payload notifikasi mingguan: ringkasan statistik siklus + insight.
 * Menampilkan progres tabungan, kategori pengeluaran terbesar, dan perbandingan
 * dengan siklus sebelumnya.
 */
export async function buildWeeklyNotification(): Promise<NotificationPayload> {
  const cycle = getCurrentCycle();
  const prevCycle = shiftCycle(cycle, -1);

  const [currentRecords, prevRecords] = await Promise.all([
    getPurchasesInRange(cycle.startDate, cycle.endDate),
    getPurchasesInRange(prevCycle.startDate, prevCycle.endDate),
  ]);

  const currentPurchases = toPurchases(currentRecords);
  const prevPurchases = toPurchases(prevRecords);

  const stats = computeCycleStats(currentPurchases);
  const prevStats = computeCycleStats(prevPurchases);

  // Top 3 kategori pengeluaran terbesar di siklus ini
  const topCategories = stats.categories
    .filter((c) => !c.excludeFromAllocation && c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 3);

  // Selisih pengeluaran vs siklus sebelumnya
  const diff = stats.totalSpent - prevStats.totalSpent;
  const diffLabel =
    diff > 0
      ? `+${formatShortIDR(diff)}`
      : diff < 0
        ? L(
            `hemat ${formatShortIDR(Math.abs(diff))}`,
            `saved ${formatShortIDR(Math.abs(diff))}`,
          )
        : L("sama", "same");

  // Sisa tabungan
  const savings = stats.remaining;
  const savingsPercent =
    SAVINGS_INITIAL > 0
      ? Math.round((savings / SAVINGS_INITIAL) * 100)
      : 0;

  let body = L(
    `Siklus ${cycle.label}: ${formatShortIDR(stats.totalSpent)} terpakai (${stats.limitPercent}% limit), sisa tabungan ${formatShortIDR(savings)} (${savingsPercent}%).`,
    `${cycle.label} cycle: ${formatShortIDR(stats.totalSpent)} used (${stats.limitPercent}% of limit), savings left ${formatShortIDR(savings)} (${savingsPercent}%).`,
  );

  if (topCategories.length > 0) {
    body += L(
      ` Terbesar: ${topCategories.map((c) => c.label.id).join(", ")}.`,
      ` Top: ${topCategories.map((c) => c.label.en).join(", ")}.`,
    );
  }

  body += L(` vs ${prevCycle.label}: `, ` vs ${prevCycle.label}: `) + diffLabel + ".";

  if (stats.overLimit) {
    body += L(
      " Perhatian: sudah melebihi limit!",
      " Warning: limit exceeded!",
    );
  }

  // --- Komponen email kaya (channel weekly-summary) ---
  const themeColor = "#4f46e5";

  // Preheader email (preview text di inbox).
  const previewText = L(
    `Penggunaan limit ${stats.limitPercent}% siklus ${cycle.label}${diff < 0 ? `, hemat ${formatShortIDR(Math.abs(diff))} dari siklus lalu` : ""}. Lihat insight lengkapnya.`,
    `${stats.limitPercent}% limit used in the ${cycle.label} cycle${diff < 0 ? `, saving ${formatShortIDR(Math.abs(diff))} vs last cycle` : ""}. See the full insights.`,
  );

  // Warna metrik sesuai kondisi.
  const limitColor = stats.overLimit
    ? "#ef4444"
    : stats.limitPercent >= 80
      ? "#f59e0b"
      : "#22c55e";
  const savingsColor = savings > 0 ? "#22c55e" : "#ef4444";

  const emailTitle = L("📊 Ringkasan Tabungan Mingguan", "📊 Weekly Savings Summary");
  const subtitle = `${APP_NAME} · ${L(`Siklus ${cycle.label}`, `Cycle ${cycle.label}`)}`;
  const greeting = L("Halo! 👋", "Hello! 👋");
  const bluf = L(
    `<strong>Insight utama:</strong> Penggunaan limit siklus ${cycle.label} mencapai <strong>${stats.limitPercent}%</strong>, dengan sisa tabungan <strong>${formatShortIDR(savings)}</strong> (${savingsPercent}%).`,
    `<strong>Key insight:</strong> The ${cycle.label} cycle limit usage reached <strong>${stats.limitPercent}%</strong>, with savings left of <strong>${formatShortIDR(savings)}</strong> (${savingsPercent}%).`,
  );
  const categoryHeader = L("Pengeluaran per Wadah", "Spending by Envelope");
  const ctaText = L("Buka Dashboard Lengkap", "Open Full Dashboard");
  const link = `${BASE_URL}/`;

  // Insight per wadah (kategori yang dialokasikan, diurutkan dari pengeluaran terbesar).
  const categoryInsights = stats.categories
    .filter((c) => !c.excludeFromAllocation && c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)
    .map((c) => ({
      name: c.label[NOTIFICATION_LOCALE] ?? c.label.id,
      detail: `${formatShortIDR(c.spent)} · ${c.percent}%`,
      dotColor: c.color,
    }));

  // Penutup sesuai kondisi siklus.
  let closing: string;
  if (stats.overLimit) {
    closing = L(
      "Pengeluaran sudah melebihi limit wadah. Yuk evaluasi kategori yang paling boros minggu depan! 💪",
      "Spending has exceeded the envelope limit. Let's review the biggest categories next week! 💪",
    );
  } else if (diff < 0) {
    closing = L(
      `Mantap! Anda hemat ${formatShortIDR(Math.abs(diff))} dibanding siklus ${prevCycle.label}. Terus pertahankan! 💪`,
      `Great job! You saved ${formatShortIDR(Math.abs(diff))} compared to the ${prevCycle.label} cycle. Keep it up! 💪`,
    );
  } else {
    closing = L(
      "Terima kasih sudah mencatat pengeluaran minggu ini. Tetap konsisten menabung! 💪",
      "Thanks for tracking your spending this week. Stay consistent with your savings! 💪",
    );
  }
  const signature = L(
    `Salam hangat,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
    `Best regards,<br/><strong style="color:#1f2937">${APP_NAME}</strong>`,
  );

  const html = buildRichEmailHtml({
    themeColor,
    title: emailTitle,
    subtitle,
    greeting,
    bluf,
    previewText,
    metrics: [
      {
        label: L("Penggunaan Limit", "Limit Usage"),
        value: `${stats.limitPercent}%`,
        color: limitColor,
      },
      {
        label: L("Total Pengeluaran", "Total Spent"),
        value: formatShortIDR(stats.totalSpent),
        color: "#1f2937",
      },
      {
        label: L("Sisa Tabungan", "Savings Left"),
        value: formatShortIDR(savings),
        color: savingsColor,
      },
    ],
    categoryHeader,
    categories: categoryInsights,
    ctaText,
    ctaUrl: link,
    closing,
    signature,
  });

  return {
    title: emailTitle,
    body,
    tag: "weekly-summary",
    url: "/",
    html,
    previewText,
  };
}

/** Ambil nama kategori dengan pengeluaran terbesar dari daftar pembelian. */
function getTopCategory(purchases: Purchase[]): string | null {
  const byCategory = new Map<string, number>();
  for (const p of purchases) {
    byCategory.set(p.categoryId, (byCategory.get(p.categoryId) ?? 0) + p.amount);
  }
  let topId: string | null = null;
  let topAmount = 0;
  for (const [id, amount] of byCategory) {
    if (amount > topAmount) {
      topId = id;
      topAmount = amount;
    }
  }
  if (!topId) return null;
  const label = CATEGORY_MAP[topId]?.label[NOTIFICATION_LOCALE];
  return label ?? topId;
}

/**
 * Bangun template email HTML kaya (kartu dengan header, preheader, metrik,
 * tabel wadah, CTA). Desain disesuaikan dengan notif-mail-whatsapp reference.
 * Font Geist dimuat via Google Fonts (link embed), dengan fallback aman.
 */
function buildRichEmailHtml(params: {
  themeColor: string;
  title: string;
  subtitle: string;
  greeting: string;
  bluf: string;
  previewText?: string;
  metrics: { label: string; value: string; color?: string }[];
  categoryHeader: string;
  categories: { name: string; detail: string; dotColor: string }[];
  ctaText: string;
  ctaUrl: string;
  closing: string;
  signature: string;
}): string {
  const font =
    "'Geist','Google Sans',Roboto,Helvetica,Arial,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
  const m = params.metrics;
  // Preheader tersembunyi (preview text di inbox) — ditarik ke luar layar.
  const preheader = params.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;max-width:0">${escapeHtml(params.previewText)}</div>`
    : "";
  return `<!DOCTYPE html>
<html lang="${NOTIFICATION_LOCALE}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<title>${escapeHtml(params.title)}</title>
<style type="text/css">
@media screen{body,table,td,p,a,span,strong,h1,h2,h3{font-family:${font}}}
</style>
<!--[if mso]>
<style type="text/css">body,table,td,p,a,span,strong,h1,h2,h3{font-family:Arial,sans-serif!important}</style>
<![endif]-->
</head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:${font}">
${preheader}
<div style="font-family:${font};max-width:560px;margin:0 auto;color:#1f2937;padding:0">
  <div style="background:${params.themeColor};color:#fff;padding:24px;text-align:center;border-radius:12px 12px 0 0">
    <h1 style="font-family:${font};margin:0;font-size:22px;font-weight:700">${escapeHtml(params.title)}</h1>
    <p style="font-family:${font};margin:4px 0 0;font-size:13px;opacity:0.9">${escapeHtml(params.subtitle)}</p>
  </div>
  <div style="background:#f9fafb;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-family:${font};margin:0 0 16px;font-size:15px">${params.greeting}</p>
    <p style="font-family:${font};margin:0 0 20px;font-size:15px;line-height:1.6">${params.bluf}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px" />
    <p style="font-family:${font};margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(L("Metrik", "Metrics"))}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      <tr>
        ${m.map((metric, i) => `<td style="padding:8px 12px;background:#fff;border:1px solid #e5e7eb;${i === 0 ? "border-radius:6px 0 0 6px;" : "border-left:none;"}${i === m.length - 1 ? "border-radius:0 6px 6px 0;" : ""}">
          <span style="font-family:${font};color:#6b7280;font-size:12px">${escapeHtml(metric.label)}</span><br/>
          <strong style="font-family:${font};font-size:18px;color:${metric.color || params.themeColor}">${escapeHtml(metric.value)}</strong>
        </td>`).join("")}
      </tr>
    </table>
    <p style="font-family:${font};margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(params.categoryHeader)}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px">
      ${params.categories.map((cat, i) => `<tr><td style="padding:8px 0;${i < params.categories.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
        <span style="display:inline-block;width:10px;height:10px;background:${cat.dotColor};border-radius:50%;margin-right:8px"></span>
        ${escapeHtml(cat.name)}<br/><span style="font-family:${font};color:#6b7280;font-size:12px">${escapeHtml(cat.detail)}</span>
      </td></tr>`).join("")}
    </table>
    <div style="text-align:center;margin:24px 0 16px">
      <a href="${escapeHtml(params.ctaUrl)}" style="font-family:${font};display:inline-block;padding:12px 32px;background:${params.themeColor};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${escapeHtml(params.ctaText)}</a>
    </div>
    <p style="font-family:${font};margin:0 0 4px;font-size:14px;line-height:1.6">${params.closing}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 12px" />
    <p style="font-family:${font};margin:0;font-size:13px;color:#6b7280;line-height:1.5">${params.signature}</p>
  </div>
</div>
</body>
</html>`;
}

/** Bangun versi HTML sederhana dari payload notifikasi untuk email (fallback). */
function toEmailHtml(payload: NotificationPayload): string {
  const link = `${BASE_URL}${payload.url}`;
  const openLabel = L("Buka Dashboard", "Open Dashboard");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
  <h2 style="margin:0 0 12px">${escapeHtml(payload.title)}</h2>
  <p style="font-size:15px;line-height:1.6;margin:0 0 16px">${escapeHtml(payload.body)}</p>
  <p style="margin:0">
    <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-size:14px">${openLabel}</a>
  </p>
</div>`;
}

/** Escape karakter HTML agar aman di email. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface PushSendResult {
  sent: number;
  failed: number;
  cleanedUp: number;
}

export interface EmailSendResult {
  emailed: boolean;
}

/**
 * Kirim notifikasi push ke semua subscriber.
 * Endpoint yang sudah expired (404/410) otomatis dihapus dari database.
 * Digunakan oleh daily-reminder (hanya notifikasi push).
 */
export async function broadcastPushNotification(
  payload: NotificationPayload,
): Promise<PushSendResult> {
  const { getAllSubscriptions, removeStaleSubscription } = await import(
    "@/services/pushService"
  );
  const { sendPushNotification } = await import("@/server/webPush");

  const subs = await getAllSubscriptions();
  let sent = 0;
  let failed = 0;
  let cleanedUp = 0;

  await Promise.all(
    subs.map(async (sub) => {
      const ok = await sendPushNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        },
        payload,
      );
      if (ok) {
        sent++;
      } else {
        failed++;
        // Endpoint tidak valid lagi -> hapus
        await removeStaleSubscription(sub.endpoint);
        cleanedUp++;
      }
    }),
  );

  return { sent, failed, cleanedUp };
}

/**
 * Kirim email notifikasi ke penerima yang dikonfigurasi (bila SMTP aktif).
 * Digunakan oleh weekly-summary (hanya email).
 */
export async function broadcastEmailNotification(
  payload: NotificationPayload,
): Promise<EmailSendResult> {
  const { sendEmail, isEmailConfigured } = await import("@/server/email");

  let emailed = false;
  if (isEmailConfigured()) {
    emailed = await sendEmail({
      subject: payload.title,
      text: payload.body,
      html: payload.html ?? toEmailHtml(payload),
    });
  }

  return { emailed };
}

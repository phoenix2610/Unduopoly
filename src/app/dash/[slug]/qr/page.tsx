import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PrintButton } from "@/components/dash/print-button";
import { QrCode } from "@/components/qr-code";
import { basePath } from "@/lib/base";
import { qrIsLocal, storefrontUrl } from "@/lib/public-url";
import { getRestaurant } from "@/lib/store";

async function Sheet({ params }: { params: PageProps<"/dash/[slug]/qr">["params"] }) {
  await connection();
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) notFound();
  const base = await basePath("/dash");

  const cards = [
    {
      key: "entrance",
      url: storefrontUrl(r.slug, "/here"),
      eyebrow: "At the entrance",
      title: "Ordered ahead?",
      body: "Scan when you arrive. We'll bring your order out. No queue, no app.",
    },
    ...r.tables.map((t) => ({
      key: t.id,
      url: storefrontUrl(r.slug, `/t/${t.qrToken}`),
      eyebrow: `${t.seats} seats`,
      title: `Table ${t.label}`,
      body: "Booked this table? Scan when you sit. Pre-ordered food comes straight here.",
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link href={`${base}/${r.slug}`} className="press rounded-md px-2 py-1.5 text-sm text-ink-2">
          ← Orders
        </Link>
        <h1 className="condensed text-2xl font-extrabold uppercase">QR codes · {r.name}</h1>
        <div className="ml-auto">
          <PrintButton />
        </div>
        {qrIsLocal && (
          <p className="w-full rounded-md border border-dashed border-pen px-3 py-2 text-sm text-ink-2">
            Local test codes. They point to <span className="num text-ink">{cards[0].url.replace(/\/s\/.*/, "")}</span>, so your phone has to be on the same Wi-Fi as this computer. On the live site they point to {r.slug}.unduopoly.com.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
        {cards.map((c) => (
          <article
            key={c.key}
            className="flex break-inside-avoid flex-col items-center rounded-lg border-[1.5px] border-dashed border-line bg-paper px-6 py-7 text-center print:h-[136mm] print:rounded-none print:justify-center"
          >
            <p className="condensed text-lg font-extrabold uppercase tracking-tight" style={{ color: r.accent }}>
              {r.name}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-ink-3">{c.eyebrow}</p>
            <p className="condensed mt-3 text-[34px] font-extrabold uppercase leading-none">{c.title}</p>
            <QrCode value={c.url} label={`QR code for ${c.title}`} className="mt-4 size-[200px] print:size-[58mm]" />
            <p className="mt-4 max-w-[30ch] text-[15px] leading-snug">{c.body}</p>
            <p className="mt-3 text-[11px] text-ink-3">Point your phone camera here · Ordering by Unduopoly</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function QrPage({ params }: PageProps<"/dash/[slug]/qr">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <Sheet params={params} />
    </Suspense>
  );
}

export const metadata = { title: "QR codes · Unduopoly" };

import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { QrCode } from "@/components/qr-code";
import { demoRestaurant } from "@/lib/demo-data";
import { qrIsLocal, storefrontUrl } from "@/lib/public-url";

async function PhoneTest() {
  await connection();
  const slug = demoRestaurant.slug;
  const codes = [
    { step: "1", title: "Order on your phone", url: `${storefrontUrl(slug)}?mode=pickup`, note: "Pick a dish, a time, pay (demo)." },
    { step: "2", title: "Entrance QR", url: storefrontUrl(slug, "/here"), note: "Scan it when you \u201carrive\u201d. Watch the kitchen screen." },
  ];
  return (
    <div className="rule mt-5 pt-4">
      <p className="condensed mb-1 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">Try it on your phone</p>
      {qrIsLocal && <p className="mb-3 text-xs text-ink-3">Phone and this computer on the same Wi-Fi. Keep the kitchen dashboard open here.</p>}
      <div className="grid grid-cols-2 gap-4">
        {codes.map((c) => (
          <div key={c.step} className="text-center">
            <QrCode value={c.url} label={c.title} className="mx-auto size-36" />
            <p className="mt-2 text-sm font-semibold">
              <span className="num text-pen">{c.step}.</span> {c.title}
            </p>
            <p className="mt-0.5 text-xs text-ink-2">{c.note}</p>
          </div>
        ))}
      </div>
      <p className="num mt-3 break-all text-center text-[11px] text-ink-3">{codes[0].url}</p>
    </div>
  );
}

export default function Home() {
  const slug = demoRestaurant.slug;
  const links = [
    { href: `/s/${slug}?mode=pickup`, label: "Order for pickup", note: "What a customer sees from Google" },
    { href: `/s/${slug}?mode=table`, label: "Book a table", note: "Same storefront, dine-in mode" },
    { href: `/dash/${slug}`, label: "Kitchen dashboard", note: "Open on a second screen while you order" },
    { href: `/dash/${slug}/qr`, label: "Printable QR codes", note: "Entrance and table codes, A4 sheet" },
  ];

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <div className="ticket tear-b rounded-t-sm px-5 pt-6">
        <p className="condensed text-[44px] font-extrabold uppercase leading-[0.9] tracking-tight">Unduopoly</p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Order ahead or book a table. Menu prices. Walk in, it&apos;s ready.</p>
        <div className="rule mt-5 pt-4">
          <p className="condensed mb-2 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">Demo · {demoRestaurant.name}</p>
          <ul>
            {links.map((l, i) => (
              <li key={l.href} className={i > 0 ? "rule" : ""}>
                <Link href={l.href} className="press flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block font-semibold">{l.label}</span>
                    <span className="block text-sm text-ink-2">{l.note}</span>
                  </span>
                  <span className="num text-pen">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <Suspense fallback={<div className="h-56" />}>
          <PhoneTest />
        </Suspense>
      </div>
    </main>
  );
}

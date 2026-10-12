import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Board } from "@/components/dash/board";
import { basePath } from "@/lib/base";
import { getRestaurant } from "@/lib/store";

async function Dashboard({ params }: { params: PageProps<"/dash/[slug]">["params"] }) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) notFound();
  const base = await basePath("/dash");
  return <Board slug={r.slug} name={r.name} qrHref={`${base}/${r.slug}/qr`} />;
}

export default function DashboardPage({ params }: PageProps<"/dash/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-rail" />}>
      <Dashboard params={params} />
    </Suspense>
  );
}

export const metadata = { title: "Orders · Unduopoly" };

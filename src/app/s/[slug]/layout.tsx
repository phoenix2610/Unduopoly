import { Suspense } from "react";
import { notFound } from "next/navigation";
import { StoreProvider } from "@/components/store/store-provider";
import { basePath } from "@/lib/base";
import { readableInk } from "@/lib/color";
import { getRestaurant } from "@/lib/store";

async function Storefront({ params, children }: { params: Promise<{ slug: string }>; children: React.ReactNode }) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);
  if (!restaurant) notFound();
  const base = await basePath(`/s/${slug}`);

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={{ "--brand": restaurant.accent, "--brand-ink": readableInk(restaurant.accent) } as React.CSSProperties}
    >
      <StoreProvider restaurant={restaurant} base={base}>
        {children}
      </StoreProvider>
    </div>
  );
}

export default function Layout({ params, children }: LayoutProps<"/s/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-desk" />}>
      <Storefront params={params}>{children}</Storefront>
    </Suspense>
  );
}

export async function generateMetadata({ params }: LayoutProps<"/s/[slug]">) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  return r
    ? { title: `${r.name} · Order ahead`, description: `Order ahead or book a table at ${r.name}, ${r.area}. Menu prices, no markup.` }
    : {};
}

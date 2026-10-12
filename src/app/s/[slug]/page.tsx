import { MenuView } from "@/components/store/menu-view";
import { reviewsFor } from "@/lib/reviews";

export default async function MenuPage({ params }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const { summary, reviews } = await reviewsFor(slug);
  return <MenuView summary={summary} reviews={reviews} />;
}

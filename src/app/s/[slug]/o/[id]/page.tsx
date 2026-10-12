import { Suspense } from "react";
import { OrderView } from "@/components/store/order-view";

async function Order({ params }: { params: PageProps<"/s/[slug]/o/[id]">["params"] }) {
  const { id } = await params;
  return <OrderView id={id} />;
}

export default function OrderPage({ params }: PageProps<"/s/[slug]/o/[id]">) {
  return (
    <Suspense>
      <Order params={params} />
    </Suspense>
  );
}

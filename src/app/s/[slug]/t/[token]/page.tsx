import { Suspense } from "react";
import { CheckInView } from "@/components/store/check-in-view";

async function TableCheckIn({ params }: { params: PageProps<"/s/[slug]/t/[token]">["params"] }) {
  const { token } = await params;
  return <CheckInView tableToken={token} />;
}

export default function TablePage({ params }: PageProps<"/s/[slug]/t/[token]">) {
  return (
    <Suspense>
      <TableCheckIn params={params} />
    </Suspense>
  );
}

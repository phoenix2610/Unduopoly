import { Suspense } from "react";
import { redirect } from "next/navigation";
import { basePath } from "@/lib/base";
import { demoRestaurant } from "@/lib/demo-data";

async function ToDemo(): Promise<null> {
  redirect(`${await basePath("/dash")}/${demoRestaurant.slug}`);
}

export default function DashIndex() {
  return (
    <Suspense>
      <ToDemo />
    </Suspense>
  );
}

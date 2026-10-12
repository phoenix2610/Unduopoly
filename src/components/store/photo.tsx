import Image from "next/image";
import type { Photo as PhotoData } from "@/lib/types";

export function Photo({
  photo,
  sizes,
  className = "",
  eager,
}: {
  photo: PhotoData;
  sizes: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      sizes={sizes}
      placeholder="blur"
      blurDataURL={photo.blur}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      className={`object-cover ${className}`}
    />
  );
}

import QRCode from "qrcode";

export async function QrCode({ value, className = "", label }: { value: string; className?: string; label: string }) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#141517", light: "#ffffff" },
  });
  return <div role="img" aria-label={label} className={`[&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

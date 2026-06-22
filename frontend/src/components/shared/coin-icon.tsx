import { cn } from "@/lib/utils";

interface CoinIconProps {
  symbol?: string;
  image?: string;
  name?: string;
  size?: number;
}

const FALLBACK_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
  BNB: "#f3ba2f",
  XRP: "#23292f",
  ADA: "#0033ad",
  AVAX: "#e84142",
  LINK: "#2a5ada",
  DOT: "#e6007a",
  MATIC: "#8247e5",
  DOGE: "#c2a633",
  SHIB: "#ff9900",
  LTC: "#345d9d",
  UNI: "#ff007a",
  ATOM: "#2e3148",
  APT: "#06e6b0",
  NEAR: "#2d2d2d",
  ARB: "#28a0f0",
  OP: "#ff0420",
  INJ: "#09a5dc",
};

export function CoinIcon({ symbol = "", image, name, size = 28 }: CoinIconProps) {
  const bg = FALLBACK_COLORS[symbol.toUpperCase()] || "hsl(var(--muted-foreground))";
  const letter = (name || symbol).charAt(0).toUpperCase();

  if (image) {
    return (
      <img
        src={image}
        alt={name || symbol}
        width={size}
        height={size}
        loading="lazy"
        className={cn("rounded-full object-cover bg-muted")}
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.42 }}
    >
      {letter}
    </div>
  );
}

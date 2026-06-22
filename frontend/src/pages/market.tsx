import { useState, useMemo } from "react";
import { Search, Flame, ChartLine as LineChartIcon, Newspaper, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/shared/section-header";
import { CoinIcon } from "@/components/shared/coin-icon";
import { Sparkline } from "@/components/shared/sparkline";
import { SentimentGauge } from "@/components/shared/sentiment-gauge";
import { EmptyState } from "@/components/shared/states";
import {
  useCoins,
  useTrending,
  useSentiment,
  useNews,
} from "@/hooks/useMarketData";
import {
  formatCurrency,
  formatPct,
  formatCompact,
  timeAgo,
  cn,
} from "@/lib/utils";
import type { SortKey, Coin } from "@/types";

type SortDir = "asc" | "desc";

function useSortable<T extends Coin>(items: T[], key: SortKey, dir: SortDir) {
  return useMemo(() => {
    return [...items].sort((a, b) => {
      const av = a[key] as unknown;
      const bv = b[key] as unknown;
      if (typeof av === "string" && typeof bv === "string") {
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = typeof av === "number" ? av : 0;
      const bn = typeof bv === "number" ? bv : 0;
      return dir === "asc" ? an - bn : bn - an;
    });
  }, [items, key, dir]);
}

export default function Market() {
  const { data: coins = [], isLoading } = useCoins();
  const { data: trending = [], isLoading: trendingLoading } = useTrending();
  const { data: sentiment } = useSentiment();
  const { data: news = [], isLoading: newsLoading } = useNews();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [tab, setTab] = useState<"all" | "gainers" | "losers">("all");

  const filtered = useMemo(() => {
    let list = coins.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.symbol.toLowerCase().includes(search.toLowerCase())
    );
    if (tab === "gainers") list = list.filter((c) => c.price_change_percentage_24h >= 0);
    if (tab === "losers") list = list.filter((c) => c.price_change_percentage_24h < 0);
    return list;
  }, [coins, search, tab]);

  const sorted = useSortable(filtered, sortKey, sortDir).slice(0, 50);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trending */}
        <Card className="p-6">
          <SectionHeader title="Trending" description="Hot searches right now" icon={Flame} />
          {trendingLoading ? (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <ul className="mt-4 space-y-1">
              {trending.map((t, i) => {
                const coin = coins.find((c) => c.id === t.id);
                const change = coin?.price_change_percentage_24h ?? 0;
                const up = change >= 0;
                return (
                  <li key={t.id}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/40 transition-colors">
                      <span className="w-4 text-xs font-medium text-muted-foreground text-center">
                        {i + 1}
                      </span>
                      <CoinIcon symbol={t.symbol} image={t.thumb} name={t.name} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground">{t.symbol}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-medium tabular-nums">
                          {coin ? formatCurrency(coin.current_price) : "—"}
                        </div>
                        <div className={cn("text-[11px] tabular-nums flex items-center gap-0.5 justify-end", up ? "text-success" : "text-destructive")}>
                          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {formatPct(change)}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Sentiment */}
        <Card className="p-6">
          <SectionHeader title="Market Sentiment" description="Fear & Greed Index" icon={Activity} />
          <div className="mt-6 flex justify-center">
            {sentiment ? (
              <SentimentGauge value={sentiment.value} classification={sentiment.classification} />
            ) : (
              <Skeleton className="h-24 w-40 rounded-full" />
            )}
          </div>
          {sentiment && (
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <MiniStat label="Yesterday" value={sentiment.yesterday} />
              <MiniStat label="Last Week" value={sentiment.last_week} />
              <MiniStat label="Last Month" value={sentiment.last_month} />
            </div>
          )}
        </Card>

        {/* Recent news */}
        <Card className="flex flex-col">
          <div className="p-6 pb-3">
            <SectionHeader title="Recent News" icon={Newspaper} />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6 max-h-[330px]">
            {newsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {news.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block rounded-lg p-2 -mx-2 hover:bg-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-muted-foreground">{n.source}</span>
                        <span className="text-[10px] text-muted-foreground">· {timeAgo(n.published_at)}</span>
                      </div>
                      <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {n.title}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Price table */}
      <Card className="overflow-hidden">
        <div className="p-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <SectionHeader title="All Cryptocurrencies" description="Live prices & market data" icon={LineChartIcon} />
          <div className="flex items-center gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="gainers">Gainers</TabsTrigger>
                <TabsTrigger value="losers">Losers</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 max-w-sm"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Search} title="No coins found" description="Try a different search term." />
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pl-6 pr-2 font-medium">#</th>
                    <th className="px-2 py-3 font-medium">
                      <SortableHeader k="name" sortKey={sortKey} dir={sortDir} onClick={toggleSort}>
                        Coin
                      </SortableHeader>
                    </th>
                    <th className="px-2 py-3 font-medium text-right">
                      <SortableHeader k="current_price" sortKey={sortKey} dir={sortDir} onClick={toggleSort}>
                        Price
                      </SortableHeader>
                    </th>
                    <th className="px-2 py-3 font-medium text-right">
                      <SortableHeader k="price_change_percentage_24h" sortKey={sortKey} dir={sortDir} onClick={toggleSort}>
                        24h
                      </SortableHeader>
                    </th>
                    <th className="px-2 py-3 font-medium text-right hidden md:table-cell">
                      <SortableHeader k="total_volume" sortKey={sortKey} dir={sortDir} onClick={toggleSort}>
                        Volume
                      </SortableHeader>
                    </th>
                    <th className="px-2 py-3 font-medium text-right hidden lg:table-cell">
                      <SortableHeader k="market_cap" sortKey={sortKey} dir={sortDir} onClick={toggleSort}>
                        Market Cap
                      </SortableHeader>
                    </th>
                    <th className="px-2 py-3 pl-2 font-medium">7d</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c) => {
                    const up = c.price_change_percentage_24h >= 0;
                    const rank = c.market_cap_rank;
                    return (
                      <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30 transition-colors group">
                        <td className="py-3 pl-6 pr-2 text-muted-foreground tabular-nums text-xs">{rank}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <CoinIcon symbol={c.symbol} image={c.image} name={c.name} size={32} />
                            <div className="min-w-0">
                              <div className="font-semibold">{c.symbol}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">{c.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right font-medium tabular-nums">{formatCurrency(c.current_price)}</td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-success" : "text-destructive")}>
                            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {formatPct(c.price_change_percentage_24h)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                          ${formatCompact(c.total_volume)}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                          ${formatCompact(c.market_cap)}
                        </td>
                        <td className="px-2 py-3 pl-2">
                          <Sparkline data={c.sparkline_in_7d.price} positive={up} width={72} height={24} />
                        </td>
                        <td className="px-6 py-3 text-right">
                          {c.ath_change_percentage > -20 ? (
                            <Badge variant="success" className="text-[9px]">Near ATH</Badge>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function SortableHeader({
  k,
  sortKey,
  dir,
  onClick,
  children,
}: {
  k: SortKey;
  sortKey: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sortKey === k;
  return (
    <button
      onClick={() => onClick(k)}
      className={cn(
        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
        active ? "text-foreground" : ""
      )}
    >
      {children}
      <span className="text-[8px] text-muted-foreground">
        {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}

import { useMemo, useState } from "react";
import { Wallet, Plus, Trash2, ChartPie as PieChartIcon, TrendingUp, ChartLine as LineChartIcon, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/shared/section-header";
import { CoinIcon } from "@/components/shared/coin-icon";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, ErrorState } from "@/components/shared/states";
import {
  useEnrichedHoldings,
  useAddPortfolioEntry,
  useDeletePortfolioEntry,
  useCoins,
} from "@/hooks/useMarketData";
import { COINS } from "@/services/marketData";
import {
  formatCurrency,
  formatPct,
  formatNumber,
  formatCompact,
  cn,
} from "@/lib/utils";

const PIE_COLORS = [
  "hsl(160 84% 39%)",
  "hsl(210 83% 53%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(0 84% 60%)",
  "hsl(190 90% 42%)",
  "hsl(330 70% 55%)",
  "hsl(90 60% 45%)",
];

export default function Portfolio() {
  const { data: holdings = [], isLoading, error, refetch } = useEnrichedHoldings();
  const { data: coins = [] } = useCoins();
  const [addOpen, setAddOpen] = useState(false);

  const totalValue = holdings.reduce((s, h) => s + h.current_value, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.invested_value, 0);
  const totalPnL = totalValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const bestPerformer = [...holdings].sort((a, b) => b.profit_loss_pct - a.profit_loss_pct)[0];
  const worstPerformer = [...holdings].sort((a, b) => a.profit_loss_pct - b.profit_loss_pct)[0];

  const allocationData = holdings.map((h, i) => ({
    name: h.symbol,
    value: h.invested_value,
    color: PIE_COLORS[i % PIE_COLORS.length],
    pct: h.allocation,
  }));

  const performanceData = useMemo(() => {
    if (holdings.length === 0) return [];
    return holdings[0]?.sparkline.map((_, i) => {
      const point: Record<string, number> = { day: i };
      holdings.forEach((h) => {
        const v = h.sparkline[i] ?? h.current_price;
        point[h.symbol] = +((v / (h.sparkline[0] || 1)) * 100).toFixed(2);
      });
      return point;
    }) ?? [];
  }, [holdings]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Value" value={formatCurrency(totalValue)} icon={Wallet} delta={totalPnLPct} isLoading={isLoading} />
        <StatCard label="Total Invested" value={formatCurrency(totalInvested)} icon={TrendingUp} isLoading={isLoading} />
        <StatCard label="Unrealized P/L" value={formatCurrency(totalPnL)} delta={totalPnLPct} icon={totalPnL >= 0 ? ArrowUpRight : ArrowDownRight} isLoading={isLoading} />
        <StatCard label="Assets" value={String(holdings.length)} icon={PieChartIcon} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings table */}
        <Card className="lg:col-span-2">
          <div className="p-6 pb-0">
            <SectionHeader
              title="Holdings"
              description="Track every asset you own"
              icon={Wallet}
              action={{ label: "Add Asset", onClick: () => setAddOpen(true) }}
            />
          </div>
          <CardContent className="p-0">
            {error ? (
              <div className="p-6">
                <ErrorState onRetry={() => refetch()} />
              </div>
            ) : isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : holdings.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Wallet}
                  title="No holdings yet"
                  description="Add your first cryptocurrency to start tracking your portfolio performance."
                  action={{ label: "Add Asset", onClick: () => setAddOpen(true) }}
                />
              </div>
            ) : (
              <DesktopTable holdings={holdings} />
            )}
          </CardContent>
        </Card>

        {/* Allocation pie */}
        <Card className="p-6">
          <SectionHeader title="Allocation" description="By invested value" icon={PieChartIcon} />
          {isLoading ? (
            <Skeleton className="mt-6 mx-auto h-52 w-52 rounded-full" />
          ) : allocationData.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon={PieChartIcon} title="No allocation" description="Add assets to view your allocation." />
            </div>
          ) : (
            <>
              <div className="mt-4 relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {allocationData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload as (typeof allocationData)[0];
                        return (
                          <div className="rounded-lg border border-border bg-popover px-3 py-1.5 text-xs shadow-md">
                            <div className="font-medium">{p.name}</div>
                            <div className="text-muted-foreground">{formatCurrency(p.value)} · {p.pct.toFixed(1)}%</div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
                  <span className="text-lg font-bold tabular-nums">{formatCurrency(totalValue, { compact: true })}</span>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {allocationData.map((a) => (
                  <li key={a.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: a.color }} />
                      <span className="font-medium">{a.name}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">{a.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      {/* Performance + best/worst */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <SectionHeader title="Performance" description="7-day relative performance (%) · normalized to 100" icon={LineChartIcon} />
          {performanceData.length === 0 ? (
            <div className="mt-6 h-[260px] flex items-center justify-center">
              <EmptyState icon={LineChartIcon} title="No performance data" />
            </div>
          ) : (
            <div className="mt-6 h-[260px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    {holdings.map((h, i) => (
                      <linearGradient key={h.symbol} id={`grad-${h.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={false} axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={36}
                  />
                  <ReTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md min-w-[160px]">
                          <div className="font-medium mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            Day {label}
                          </div>
                          {payload
                            .slice()
                            .sort((a, b) => (b.value as number) - (a.value as number))
                            .map((p) => (
                              <div key={p.dataKey as string} className="flex items-center justify-between gap-3 py-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.color }} />
                                  <span className="font-medium">{p.dataKey as string}</span>
                                </div>
                                <span className="tabular-nums">{(p.value as number).toFixed(2)}</span>
                              </div>
                            ))}
                        </div>
                      );
                    }}
                  />
                  {holdings.map((h, i) => (
                    <Area
                      key={h.symbol}
                      type="monotone"
                      dataKey={h.symbol}
                      stroke={PIE_COLORS[i % PIE_COLORS.length]}
                      strokeWidth={1.75}
                      fill={`url(#grad-${h.symbol})`}
                      animationDuration={600}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeader title="Highlights" icon={TrendingUp} />
          <div className="mt-5 space-y-3">
            <HighlightRow
              label="Best Performer"
              holding={bestPerformer}
              tone="up"
              isLoading={isLoading}
              empty={holdings.length === 0}
            />
            <HighlightRow
              label="Worst Performer"
              holding={worstPerformer}
              tone="down"
              isLoading={isLoading}
              empty={holdings.length === 0}
            />
            <div className="rounded-xl border border-border p-4 space-y-2">
              <span className="text-xs text-muted-foreground">Diversification</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, holdings.length * 12)}%` }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums">{Math.min(100, holdings.length * 12)}%</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {holdings.length >= 8
                  ? "Excellent diversification across multiple assets."
                  : holdings.length >= 4
                  ? "Good diversification. Add more to reduce risk."
                  : "Low diversification. Consider adding more assets."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <AddAssetDialog open={addOpen} onOpenChange={setAddOpen} coins={coins.length ? coins : COINS} />
    </div>
  );
}

// --- Desktop holdings table ---
function DesktopTable({ holdings }: { holdings: import("@/types").EnrichedHolding[] }) {
  const deleteMutation = useDeletePortfolioEntry();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="py-3 pl-6 pr-2 font-medium">Asset</th>
            <th className="px-2 py-3 font-medium text-right">Amount</th>
            <th className="px-2 py-3 font-medium text-right">Buy Price</th>
            <th className="px-2 py-3 font-medium text-right">Current</th>
            <th className="px-2 py-3 font-medium text-right">Value</th>
            <th className="px-2 py-3 font-medium text-right">P/L</th>
            <th className="px-2 py-3 pl-4 font-medium">7d</th>
            <th className="px-6 py-3 font-medium text-right"></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const up = h.profit_loss >= 0;
            const isDeleting = confirmId === h.id;
            return (
              <tr key={h.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30 transition-colors group">
                <td className="py-3 pl-6 pr-2">
                  <div className="flex items-center gap-3">
                    <CoinIcon symbol={h.symbol} image={h.image} name={h.name} size={32} />
                    <div className="min-w-0">
                      <div className="font-semibold">{h.symbol}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">{h.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-right tabular-nums">{formatNumber(h.amount, 4)}</td>
                <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(h.buy_price)}</td>
                <td className="px-2 py-3 text-right tabular-nums">{formatCurrency(h.current_price)}</td>
                <td className="px-2 py-3 text-right tabular-nums font-medium">{formatCurrency(h.current_value)}</td>
                <td className="px-2 py-3 text-right tabular-nums">
                  <div className={cn("flex flex-col items-end", up ? "text-success" : "text-destructive")}>
                    <span className="font-semibold">{formatPct(h.profit_loss_pct)}</span>
                    <span className="text-[11px]">{formatCurrency(h.profit_loss)}</span>
                  </div>
                </td>
                <td className="px-2 py-3 pl-4">
                  <div className="flex justify-end">
                    <ResponsiveContainer width={72} height={28}>
                      <AreaChart data={h.sparkline.map((p, i) => ({ i, p }))}>
                        <defs>
                          <linearGradient id={`t-${h.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={up ? "hsl(var(--success))" : "hsl(var(--destructive))"} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={up ? "hsl(var(--success))" : "hsl(var(--destructive))"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="p" stroke={up ? "hsl(var(--success))" : "hsl(var(--destructive))"} strokeWidth={1.5} fill={`url(#t-${h.id})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </td>
                <td className="px-6 py-3 text-right">
                  {isDeleting ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">Delete?</span>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmId(null)}>
                        No
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7"
                        isLoading={deleteMutation.isPending}
                        onClick={() => {
                          deleteMutation.mutate(h.id, { onSuccess: () => setConfirmId(null) });
                        }}
                      >
                        Yes
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmId(h.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HighlightRow({
  label,
  holding,
  tone,
  isLoading,
  empty,
}: {
  label: string;
  holding?: import("@/types").EnrichedHolding;
  tone: "up" | "down";
  isLoading: boolean;
  empty: boolean;
}) {
  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (empty || !holding) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }
  const up = holding.profit_loss >= 0;
  return (
    <div className="rounded-xl border border-border p-4 flex items-center gap-3">
      <CoinIcon symbol={holding.symbol} image={holding.image} name={holding.name} size={40} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{holding.symbol}</div>
      </div>
      <div className="text-right">
        <div className={cn("text-sm font-semibold tabular-nums", up ? "text-success" : "text-destructive")}>
          {formatPct(holding.profit_loss_pct)}
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(holding.profit_loss)}</div>
      </div>
    </div>
  );
}

// --- Add asset dialog ---
function AddAssetDialog({
  open,
  onOpenChange,
  coins,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coins: import("@/types").Coin[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<import("@/types").Coin | null>(null);
  const [amount, setAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const addMutation = useAddPortfolioEntry();

  const filtered = coins
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.symbol.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 8);

  function reset() {
    setSearch("");
    setSelected(null);
    setAmount("");
    setBuyPrice("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !amount || !buyPrice) return;
    addMutation.mutate(
      {
        coin_id: selected.id,
        symbol: selected.symbol,
        name: selected.name,
        image: selected.image,
        amount: parseFloat(amount),
        buy_price: parseFloat(buyPrice),
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Asset</DialogTitle>
          <DialogDescription>Select a cryptocurrency and enter your position.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!selected ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search coins..."
                  value={search}
                  autoFocus
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[280px] overflow-y-auto scrollbar-thin space-y-1">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      setBuyPrice(String(c.current_price));
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg p-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <CoinIcon symbol={c.symbol} image={c.image} name={c.name} size={32} />
                      <div>
                        <div className="text-sm font-medium">{c.symbol}</div>
                        <div className="text-[11px] text-muted-foreground">{c.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums">{formatCurrency(c.current_price)}</div>
                      <div className={cn("text-[11px] tabular-nums", c.price_change_percentage_24h >= 0 ? "text-success" : "text-destructive")}>
                        {formatPct(c.price_change_percentage_24h)}
                      </div>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">No coins found</div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={selected.symbol} image={selected.image} name={selected.name} size={36} />
                  <div>
                    <div className="font-medium">{selected.symbol}</div>
                    <div className="text-xs text-muted-foreground">{selected.name}</div>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  Change
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Amount</label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    autoFocus
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Buy Price (USD)</label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
              {amount && buyPrice && (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Investment</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(parseFloat(amount) * parseFloat(buyPrice))}
                  </span>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addMutation.isPending || !amount || !buyPrice}>
                  {addMutation.isPending ? "Adding..." : "Add to Portfolio"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Bot,
  Sparkles,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { SectionHeader } from "@/components/shared/section-header";
import { CoinIcon } from "@/components/shared/coin-icon";
import { Sparkline } from "@/components/shared/sparkline";
import { SentimentGauge } from "@/components/shared/sentiment-gauge";
import { EmptyState, ErrorState } from "@/components/shared/states";
import {
  useEnrichedHoldings,
  useAiInsights,
  useNews,
  useSentiment,
} from "@/hooks/useMarketData";
import { formatCurrency, formatPct, timeAgo, formatCompact } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: holdings, isLoading, error } = useEnrichedHoldings();
  const { data: news = [], isLoading: newsLoading } = useNews();
  const { data: insights = [], isLoading: insightsLoading } = useAiInsights();
  const { data: sentiment } = useSentiment();

  const totalValue = holdings?.reduce((s, h) => s + h.current_value, 0) ?? 0;
  const totalInvested = holdings?.reduce((s, h) => s + h.invested_value, 0) ?? 0;
  const totalPnL = totalValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const dailyChangePct = holdings?.length
    ? holdings.reduce((s, h) => s + h.price_change_24h * (h.current_value / totalValue), 0)
    : 0;
  const dailyPnL = (totalValue * dailyChangePct) / 100;

  const gainers = [...(holdings ?? [])]
    .sort((a, b) => b.profit_loss_pct - a.profit_loss_pct)
    .slice(0, 3);
  const losers = [...(holdings ?? [])]
    .sort((a, b) => a.profit_loss_pct - b.profit_loss_pct)
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 md:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-primary">
                Welcome back
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Your portfolio is{" "}
              <span className={totalPnL >= 0 ? "text-success" : "text-destructive"}>
                {totalPnL >= 0 ? "up" : "down"} {formatPct(totalPnLPct)}
              </span>{" "}
              today
            </h2>
            <p className="text-sm text-muted-foreground">
              Market sentiment is <strong className="text-foreground">{sentiment?.classification}</strong> ·
              Let AI surface what matters now.
            </p>
          </div>
          <Button onClick={() => navigate("/assistant")} className="shrink-0">
            <Bot className="h-4 w-4" />
            Ask AI Assistant
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(totalValue)}
          delta={totalPnLPct}
          hint="all time"
          icon={Wallet}
          isLoading={isLoading}
        />
        <StatCard
          label="Today's P/L"
          value={formatCurrency(dailyPnL)}
          delta={dailyChangePct}
          hint="24h"
          icon={Activity}
          isLoading={isLoading}
        />
        <StatCard
          label="Total Invested"
          value={formatCurrency(totalInvested)}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          label="Total Profit/Loss"
          value={formatCurrency(totalPnL)}
          delta={totalPnLPct}
          hint="unrealized"
          icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI insight */}
        <Card className="lg:col-span-2 overflow-hidden border-primary/20">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent pointer-events-none" />
            <CardContent className="relative p-6">
              <SectionHeader
                title="AI Market Summary"
                description="Generated insights powered by your crew"
                icon={Bot}
                action={{ label: "Open Assistant", onClick: () => navigate("/assistant") }}
              />
              {insightsLoading ? (
                <div className="mt-5 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-[95%]" />
                  <Skeleton className="h-3 w-[88%]" />
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {insights.slice(0, 2).map((ins) => {
                    const tone =
                      ins.prediction === "bullish"
                        ? "text-success"
                        : ins.prediction === "bearish"
                        ? "text-destructive"
                        : "text-muted-foreground";
                    return (
                      <div
                        key={ins.ticker}
                        className="group rounded-xl border border-border p-4 hover:border-primary/40 hover:bg-accent/40 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono uppercase">{ins.ticker}</Badge>
                            <span className="text-sm font-medium">{ins.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn("text-xs font-medium capitalize", tone)}>
                              {ins.prediction}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Sparkles className="h-3 w-3" />
                              {ins.confidence}% conf.
                            </div>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                          {ins.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>
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
              <Stat label="Yesterday" value={sentiment.yesterday} />
              <Stat label="Last Week" value={sentiment.last_week} />
              <Stat label="Last Month" value={sentiment.last_month} />
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gainers/Losers */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <GainersCard title="Top Gainers" data={gainers} icon={TrendingUp} tone="up" isLoading={isLoading} />
            <GainersCard title="Top Losers" data={losers} icon={TrendingDown} tone="down" isLoading={isLoading} />
          </div>
        </Card>

        {/* News feed */}
        <Card className="flex flex-col">
          <div className="p-6 pb-3">
            <SectionHeader title="Latest News" icon={Newspaper} />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6 max-h-[365px]">
            {newsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : news.length === 0 ? (
              <EmptyState icon={Newspaper} title="No news found" />
            ) : (
              <ul className="space-y-3">
                {news.slice(0, 5).map((n) => {
                  const sentimentTone =
                    n.sentiment === "positive"
                      ? "bg-success/10 text-success"
                      : n.sentiment === "negative"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground";
                  return (
                    <li key={n.id}>
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group block rounded-lg p-2 -mx-2 hover:bg-accent/40 transition-colors"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <span className={cn("text-[9px] font-medium uppercase px-1.5 py-0.5 rounded", sentimentTone)}>
                            {n.sentiment}
                          </span>
                          <span className="text-[10px] text-muted-foreground">· {n.source}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(n.published_at)}</span>
                        </div>
                        <p className="text-xs font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {n.title}
                        </p>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Error state for portfolio */}
      {error && (
        <ErrorState
          description="We couldn't fetch your portfolio holdings."
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Holdings preview */}
      {holdings && holdings.length > 0 && (
        <Card className="p-6">
          <SectionHeader
            title="Your Holdings"
            description={`${holdings.length} assets tracked`}
            icon={Wallet}
            action={{ label: "View Portfolio", onClick: () => navigate("/portfolio") }}
          />
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {holdings.slice(0, 6).map((h) => {
              const up = h.profit_loss >= 0;
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CoinIcon symbol={h.symbol} image={h.image} name={h.name} size={36} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate">{h.symbol}</span>
                        <span className="text-[10px] text-muted-foreground">{formatCompact(h.amount)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">
                        {formatCurrency(h.current_price)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn("text-sm font-semibold tabular-nums", up ? "text-success" : "text-destructive")}>
                      {formatCurrency(h.profit_loss)}
                    </span>
                    <Sparkline data={h.sparkline} positive={up} width={56} height={24} />
                  </div>
                </div>
              );
            })}
          </div>
          <Button variant="ghost" className="mt-4 w-full" onClick={() => navigate("/portfolio")}>
            View all holdings
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

interface GainersCardProps {
  title: string;
  data: { id: string; symbol: string; name: string; image?: string; profit_loss: number; profit_loss_pct: number; sparkline: number[] }[];
  icon: typeof TrendingUp;
  tone: "up" | "down";
  isLoading: boolean;
}

function GainersCard({ title, data, icon: Icon, tone, isLoading }: GainersCardProps) {
  return (
    <div className="p-6">
      <SectionHeader title={title} icon={Icon} />
      {isLoading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="mt-4 text-xs text-muted-foreground text-center py-6">No data</div>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.map((h) => {
            const up = h.profit_loss >= 0;
            return (
              <li key={h.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-accent/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CoinIcon symbol={h.symbol} image={h.image} name={h.name} size={28} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{h.symbol}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{h.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Sparkline data={h.sparkline} positive={up} width={48} height={20} />
                  <span className={cn("text-xs font-semibold tabular-nums w-16 text-right", up ? "text-success" : "text-destructive")}>
                    {formatPct(h.profit_loss_pct)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

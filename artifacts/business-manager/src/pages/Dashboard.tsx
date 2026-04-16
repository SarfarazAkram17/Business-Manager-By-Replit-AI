import { useState } from "react";
import {
  useGetDashboardStats, getGetDashboardStatsQueryKey,
  useGetDashboardChart, getGetDashboardChartQueryKey,
  useGetRecentSales, getGetRecentSalesQueryKey
} from "@workspace/api-client-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/contexts/SettingsContext";
import ImageLightbox from "@/components/ImageLightbox";

type Period = "today" | "week" | "month" | "year";

const PERIODS: { label: string; value: Period }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
];

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const { formatCurrency } = useSettings();

  const localDate = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
  })();
  const tzOffset = -new Date().getTimezoneOffset();

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(
    { period, localDate, tzOffset },
    { query: { queryKey: getGetDashboardStatsQueryKey({ period, localDate, tzOffset }) } }
  );
  const { data: chartData, isLoading: chartLoading } = useGetDashboardChart(
    { period, localDate, tzOffset },
    { query: { queryKey: getGetDashboardChartQueryKey({ period, localDate, tzOffset }) } }
  );
  const { data: recentSales, isLoading: salesLoading } = useGetRecentSales({
    query: { queryKey: getGetRecentSalesQueryKey() }
  });

  const statCards = [
    {
      label: "Total Revenue",
      value: stats ? formatCurrency(stats.totalRevenue) : null,
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Profit",
      value: stats ? formatCurrency(stats.totalProfit) : null,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Total Expenses",
      value: stats ? formatCurrency(stats.totalExpenses) : null,
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Net Profit",
      value: stats ? formatCurrency(stats.netProfit) : null,
      icon: BarChart3,
      color: stats && stats.netProfit >= 0 ? "text-emerald-400" : "text-destructive",
      bg: stats && stats.netProfit >= 0 ? "bg-emerald-400/10" : "bg-destructive/10",
    },
    {
      label: "Total Sales",
      value: stats ? String(stats.totalSales) : null,
      icon: ShoppingCart,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Items Sold",
      value: stats ? String(stats.totalItems) : null,
      icon: Package,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-card-border text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              data-testid={`button-period-${p.value}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-card border border-card-border rounded-xl p-5" data-testid={`card-stat-${i}`}>
            {statsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">Revenue &amp; Profit Overview</h2>
        {chartLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData ?? []} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--popover-border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="hsl(var(--primary))"
                fill="url(#revGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="hsl(142 71% 45%)"
                fill="url(#profGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Sales</h2>
        {salesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !recentSales?.length ? (
          <p className="text-muted-foreground text-sm text-center py-8">No sales yet</p>
        ) : (
          <div className="space-y-3">
            {recentSales.map(sale => (
              <div key={sale.id} className="flex items-center gap-4 p-3 rounded-xl bg-background border border-border" data-testid={`card-sale-${sale.id}`}>
                {sale.images && sale.images.length > 0 ? (
                  <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setLightbox({ images: sale.images, index: 0 })}>
                    <img
                      src={sale.images[0]}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity"
                    />
                    {sale.images.length > 1 && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                        +{sale.images.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{sale.productName}</p>
                  <p className="text-sm text-muted-foreground">Qty: {sale.quantity} · {sale.saleDate}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-foreground">{formatCurrency(sale.sellPrice)}</p>
                  <p className={`text-sm ${sale.profit >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                    {sale.profit >= 0 ? "+" : ""}{formatCurrency(sale.profit)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

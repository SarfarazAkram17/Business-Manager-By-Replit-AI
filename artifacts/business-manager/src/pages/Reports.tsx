import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useGetMonthlyReport,
  getGetMonthlyReportQueryKey,
} from "@workspace/api-client-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3, Package, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/contexts/SettingsContext";
import ImageLightbox from "@/components/ImageLightbox";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const { formatCurrency } = useSettings();

  const { data: availableYears } = useQuery<number[]>({
    queryKey: ["reports-available-years"],
    queryFn: async () => {
      const res = await fetch("/api/reports/available-years", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch years");
      return res.json();
    },
  });

  const years =
    availableYears && availableYears.length > 0
      ? availableYears
      : [now.getFullYear()];

  const { data: report, isLoading } = useGetMonthlyReport(
    { month, year },
    { query: { queryKey: getGetMonthlyReportQueryKey({ month, year }) } },
  );

  const prevMonth = () => {
    if (month === 1) {
      const prevYear = year - 1;
      setMonth(12);
      setYear(prevYear);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      const nextYear = year + 1;
      setMonth(1);
      setYear(nextYear);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Monthly Report</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-accent text-foreground cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-card border border-card-border rounded-lg text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-card border border-card-border rounded-lg text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-accent text-foreground cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Revenue",
                value: formatCurrency(report.totalRevenue),
                color: "text-primary",
              },
              {
                label: "Profit",
                value: formatCurrency(report.totalProfit),
                color: "text-emerald-400",
              },
              {
                label: "Expenses",
                value: formatCurrency(report.totalExpenses),
                color: "text-destructive",
              },
              {
                label: "Net Profit",
                value: formatCurrency(report.netProfit),
                color:
                  report.netProfit >= 0
                    ? "text-emerald-400"
                    : "text-destructive",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-card border border-card-border rounded-xl p-4"
              >
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-xl font-bold mt-1 ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Daily Revenue &amp; Profit — {MONTHS[month - 1]} {year}
            </h2>
            {report.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={report.chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="profGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(142 71% 45%)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(142 71% 45%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                    interval={4}
                  />
                  <YAxis
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                  />
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
                    fill="url(#revGrad2)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="hsl(142 71% 45%)"
                    fill="url(#profGrad2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No sales data for this period
              </p>
            )}
          </div>

          {report.topProducts.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Top Products
              </h2>
              <div className="space-y-2">
                {(
                  report.topProducts as Array<{
                    name: string;
                    totalQuantity: number;
                    totalRevenue: number;
                    totalProfit: number;
                    images: string[];
                  }>
                ).map((product, i) => (
                  <div
                    key={product.name}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {i + 1}
                    </div>
                    {product.images && product.images.length > 0 ? (
                      <div
                        className="relative flex-shrink-0 cursor-pointer"
                        onClick={() =>
                          setLightbox({ images: product.images, index: 0 })
                        }
                      >
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover hover:opacity-80 transition-opacity"
                        />
                        {product.images.length > 1 && (
                          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                            +{product.images.length - 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sold: {product.totalQuantity} units
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-foreground font-medium">
                        {formatCurrency(product.totalRevenue)}
                      </p>
                      <p className="text-emerald-400 text-xs">
                        +{formatCurrency(product.totalProfit)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.sales.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                All Sales ({report.sales.length})
              </h2>
              <div className="space-y-2">
                {report.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border"
                  >
                    {sale.images?.length > 0 ? (
                      <div
                        className="relative flex-shrink-0 cursor-pointer"
                        onClick={() =>
                          setLightbox({ images: sale.images, index: 0 })
                        }
                      >
                        <img
                          src={sale.images[0]}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover hover:opacity-80 transition-opacity"
                        />
                        {sale.images.length > 1 && (
                          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                            +{sale.images.length - 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {sale.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.saleDate} · Qty: {sale.quantity}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-foreground">
                        {formatCurrency(sale.sellPrice)}
                      </p>
                      <p
                        className={`text-xs ${sale.profit >= 0 ? "text-emerald-400" : "text-destructive"}`}
                      >
                        {sale.profit >= 0 ? "+" : ""}
                        {formatCurrency(sale.profit)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.expenses.length > 0 && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                All Expenses ({report.expenses.length})
              </h2>
              <div className="space-y-2">
                {report.expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border"
                  >
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {expense.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.expenseDate}
                        {expense.category ? ` · ${expense.category}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-destructive flex-shrink-0">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.sales.length === 0 && report.expenses.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">
                No data for {MONTHS[month - 1]} {year}
              </p>
            </div>
          )}
        </>
      ) : null}

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

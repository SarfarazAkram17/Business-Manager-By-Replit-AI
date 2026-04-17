import { useState, useEffect } from "react";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Check, Trash2, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, currencies } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import CustomCalendar from "@/components/CustomCalendar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const THEMES = [
  {
    id: "amethyst",
    name: "Amethyst",
    description: "Deep purple & violet",
    gradient: "from-purple-900 to-violet-800",
    accent: "bg-violet-500",
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Dark green & teal",
    gradient: "from-emerald-900 to-teal-800",
    accent: "bg-emerald-500",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep blue & cyan",
    gradient: "from-blue-900 to-cyan-800",
    accent: "bg-blue-500",
  },
];

const MONTH_NAMES = [
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

type PdfPeriod = "day" | "week" | "month" | "year";

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  const daysSinceSat = (d.getUTCDay() + 1) % 7;
  const sat = new Date(d);
  sat.setUTCDate(d.getUTCDate() - daysSinceSat);
  const fri = new Date(sat);
  fri.setUTCDate(sat.getUTCDate() + 6);
  const fmt = (x: Date) =>
    `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
  return { startDate: fmt(sat), endDate: fmt(fri) };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtAmt(currency: string, n: number) {
  return `${currency} ${n.toFixed(2)}`;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    theme,
    currency,
    businessName,
    setTheme,
    setCurrency,
    setBusinessName,
  } = useSettings();
  const currencySym = currencies[currency] ?? currency;

  const [currencySearch, setCurrencySearch] = useState("");
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [localBizName, setLocalBizName] = useState(businessName);

  // Danger zone
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF state
  const [pdfPeriod, setPdfPeriod] = useState<PdfPeriod>("day");
  const [pdfDay, setPdfDay] = useState(todayStr());
  const [pdfWeekAnchor, setPdfWeekAnchor] = useState(todayStr());
  const [pdfMonth, setPdfMonth] = useState(new Date().getMonth());
  const [pdfMonthYear, setPdfMonthYear] = useState(new Date().getFullYear());
  const [pdfYear, setPdfYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });
  const updateMutation = useUpdateSettings();

  useEffect(() => {
    if (settings) setLocalBizName(settings.businessName);
  }, [settings]);
  useEffect(() => {
    setLocalBizName(businessName);
  }, [businessName]);

  const handleSave = async () => {
    try {
      const result = await updateMutation.mutateAsync({
        data: { businessName: localBizName, theme, currency },
      });
      setBusinessName(result.businessName);
      setTheme(result.theme);
      setCurrency(result.currency);
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      toast({ title: "Settings saved" });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings",
      });
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/data", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast({
        title: "All data deleted",
        description: "Your sales, expenses and inventory have been cleared.",
      });
      queryClient.invalidateQueries();
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete data.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // --- PDF generation ---
  function getDateRange(): {
    startDate: string;
    endDate: string;
    label: string;
  } {
    if (pdfPeriod === "day") {
      return {
        startDate: pdfDay,
        endDate: pdfDay,
        label: `Day: ${formatDate(pdfDay)}`,
      };
    }
    if (pdfPeriod === "week") {
      const { startDate, endDate } = getWeekRange(pdfWeekAnchor);
      return {
        startDate,
        endDate,
        label: `Week: ${formatDate(startDate)} — ${formatDate(endDate)}`,
      };
    }
    if (pdfPeriod === "month") {
      const start = `${pdfMonthYear}-${String(pdfMonth + 1).padStart(2, "0")}-01`;
      const endDay = new Date(pdfMonthYear, pdfMonth + 1, 0).getDate();
      const end = `${pdfMonthYear}-${String(pdfMonth + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
      return {
        startDate: start,
        endDate: end,
        label: `Month: ${MONTH_NAMES[pdfMonth]} ${pdfMonthYear}`,
      };
    }
    return {
      startDate: `${pdfYear}-01-01`,
      endDate: `${pdfYear}-12-31`,
      label: `Year: ${pdfYear}`,
    };
  }

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const { startDate, endDate, label } = getDateRange();
      console.log(label)
      const [salesRes, expensesRes, inventoryRes] = await Promise.all([
        fetch(`/api/sales?startDate=${startDate}&endDate=${endDate}`, {
          credentials: "include",
        }),
        fetch(`/api/expenses?startDate=${startDate}&endDate=${endDate}`, {
          credentials: "include",
        }),
        fetch(`/api/inventory`, { credentials: "include" }),
      ]);
      const [sales, expenses, inventory] = await Promise.all([
        salesRes.json(),
        expensesRes.json(),
        inventoryRes.json(),
      ]);

      const totalRevenue = sales.reduce(
        (s: number, r: any) => s + r.sellPrice * r.quantity,
        0,
      );
      const totalProfit = sales.reduce((s: number, r: any) => s + r.profit, 0);
      const totalExpenses = expenses.reduce(
        (s: number, r: any) => s + Number(r.amount),
        0,
      );
      const net = totalRevenue - totalExpenses;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 14;

      // Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(businessName, margin, 20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(label, margin, 29);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 36);
      doc.setDrawColor(160, 160, 160);
      doc.line(margin, 40, pageW - margin, 40);

      // Summary
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", margin, 50);
      autoTable(doc, {
        startY: 54,
        head: [["", ""]],
        showHead: false,
        body: [
          ["Total Revenue", fmtAmt(currency, totalRevenue)],
          ["Total Expenses", fmtAmt(currency, totalExpenses)],
          ["Gross Profit (Sales)", fmtAmt(currency, totalProfit)],
          ["Net Profit", fmtAmt(currency, net)],
        ],
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 70 },
          1: { halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      const afterSummary = (doc as any).lastAutoTable.finalY + 8;

      // Sales
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Sales (${sales.length})`, margin, afterSummary);
      autoTable(doc, {
        startY: afterSummary + 4,
        head: [
          [
            "Date",
            "Product",
            "Qty",
            `Sell (${currency})`,
            `Buy (${currency})`,
            `Profit (${currency})`,
          ],
        ],
        body: sales.length
          ? sales.map((s: any) => [
              s.saleDate,
              s.productName,
              s.quantity,
              s.sellPrice.toFixed(2),
              s.buyPrice.toFixed(2),
              s.profit.toFixed(2),
            ])
          : [["No sales in this period", "", "", "", "", ""]],
        theme: "striped",
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 26 }, // Date
          1: { cellWidth: "auto" }, // Product
          2: { cellWidth: 12 }, // Qty
          3: { cellWidth: 28 }, // Sell
          4: { cellWidth: 28 }, // Buy
          5: { cellWidth: 28 }, // Profit
        },
        margin: { left: margin, right: margin },
      });

      const afterSales = (doc as any).lastAutoTable.finalY + 8;

      // Expenses
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Expenses (${expenses.length})`, margin, afterSales);
      autoTable(doc, {
        startY: afterSales + 4,
        head: [["Date", "Category", `Amount (${currency})`, "Notes"]],
        body: expenses.length
          ? expenses.map((e: any) => [
              e.expenseDate,
              e.category,
              Number(e.amount).toFixed(2),
              e.notes ?? "",
            ])
          : [["No expenses in this period", "", "", ""]],
        theme: "striped",
        headStyles: {
          fillColor: [239, 68, 68],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 26 }, // Date
          1: { cellWidth: "auto" }, // Category
          2: { cellWidth: 36 }, // Amount
          3: { cellWidth: 50 }, // Notes
        },
        margin: { left: margin, right: margin },
      });

      const afterExpenses = (doc as any).lastAutoTable.finalY + 8;

      // Inventory snapshot
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Inventory Snapshot (${inventory.length} items)`,
        margin,
        afterExpenses,
      );
      autoTable(doc, {
        startY: afterExpenses + 4,
        head: [["Product", "Stock", `Buy (${currency})`, `Sell (${currency})`]],
        body: inventory.length
          ? inventory.map((i: any) => [
              i.name,
              i.quantity,
              Number(i.buyPrice).toFixed(2),
              Number(i.sellPrice).toFixed(2),
            ])
          : [["No inventory items", "", "", ""]],
        theme: "striped",
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: "auto" }, // Product
          1: { cellWidth: 18 }, // Stock
          2: { cellWidth: 36 }, // Buy
          3: { cellWidth: 36 }, // Sell
        },
        margin: { left: margin, right: margin },
      });

      const safeName = businessName.replace(/[^a-z0-9]/gi, "_");
      const safePeriod = label.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
      doc.save(`${safeName}_${safePeriod}.pdf`);
      toast({ title: "PDF downloaded" });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate PDF.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredCurrencies = Object.entries(currencies).filter(
    ([code, symbol]) =>
      !currencySearch ||
      code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      symbol.includes(currencySearch),
  );

  const weekRange = getWeekRange(pdfWeekAnchor);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Business */}
      <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Business</h2>
        <div>
          <Label className="text-foreground text-sm mb-1.5 block">
            Business Name
          </Label>
          <Input
            value={localBizName}
            onChange={(e) => setLocalBizName(e.target.value)}
            className="bg-background border-input text-foreground max-w-sm"
          />
        </div>
      </div>

      {/* Theme */}
      <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Theme</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer text-left transition-all ${theme === t.id ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-primary/50"}`}
            >
              <div
                className={`h-16 rounded-lg bg-linear-to-br ${t.gradient} mb-3 relative overflow-hidden`}
              >
                <div
                  className={`absolute bottom-2 right-2 w-4 h-4 rounded-full ${t.accent}`}
                />
              </div>
              <p className="font-semibold text-foreground text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.description}
              </p>
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Currency</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-background border border-input rounded-lg">
            <span className="text-xl font-bold text-primary">
              {currencies[currency]}
            </span>
            <span className="text-foreground font-medium">{currency}</span>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCurrencyModal(true)}
            className="cursor-pointer border-input"
          >
            Change Currency
          </Button>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="cursor-pointer w-full sm:w-auto px-8"
      >
        {updateMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>

      {/* PDF Download */}
      <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Download Report (PDF)
          </h2>
        </div>

        {/* Period type tabs */}
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month", "year"] as PdfPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPdfPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize cursor-pointer transition-colors ${pdfPeriod === p ? "bg-primary text-primary-foreground" : "bg-background border border-input text-foreground hover:border-primary/50"}`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="space-y-3">
          {pdfPeriod === "day" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-foreground text-sm">Select Date</Label>
                <button
                  onClick={() => setPdfDay(todayStr())}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Today
                </button>
              </div>
              <div className="max-w-xs">
                <CustomCalendar
                  value={pdfDay}
                  onChange={setPdfDay}
                  disableFuture
                  label=""
                  placeholder="Pick a date"
                />
              </div>
            </div>
          )}

          {pdfPeriod === "week" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-foreground text-sm">
                  Pick any date in the week
                </Label>
                <button
                  onClick={() => setPdfWeekAnchor(todayStr())}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  This Week
                </button>
              </div>
              <div className="max-w-xs">
                <CustomCalendar
                  value={pdfWeekAnchor}
                  onChange={setPdfWeekAnchor}
                  disableFuture
                  label=""
                  placeholder="Pick a date"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Week:{" "}
                <span className="text-foreground font-medium">
                  {formatDate(weekRange.startDate)} →{" "}
                  {formatDate(weekRange.endDate)}
                </span>
              </p>
            </div>
          )}

          {pdfPeriod === "month" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-foreground text-sm">Select Month</Label>
                <button
                  onClick={() => {
                    setPdfMonth(new Date().getMonth());
                    setPdfMonthYear(new Date().getFullYear());
                  }}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  This Month
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={pdfMonth}
                  onChange={(e) => setPdfMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-background border border-input rounded-lg text-foreground text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  value={pdfMonthYear}
                  onChange={(e) => setPdfMonthYear(Number(e.target.value))}
                  className="w-24 bg-background border-input text-foreground"
                  min={2000}
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
          )}

          {pdfPeriod === "year" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-foreground text-sm">Select Year</Label>
                <button
                  onClick={() => setPdfYear(new Date().getFullYear())}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  This Year
                </button>
              </div>
              <Input
                type="number"
                value={pdfYear}
                onChange={(e) => setPdfYear(Number(e.target.value))}
                className="w-28 bg-background border-input text-foreground"
                min={2000}
                max={new Date().getFullYear()}
              />
            </div>
          )}
        </div>

        <Button
          onClick={handleDownloadPdf}
          disabled={isGenerating}
          className="cursor-pointer gap-2"
        >
          <Download className="w-4 h-4" />
          {isGenerating ? "Generating..." : "Download PDF"}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="bg-card border-2 border-destructive/40 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h2 className="text-lg font-semibold text-destructive">
            Danger Zone
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently delete all your sales, expenses, and inventory data. This
          action cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            setDeleteConfirmText("");
            setShowDeleteModal(true);
          }}
          className="cursor-pointer gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete All My Data
        </Button>
      </div>

      {/* Currency modal */}
      <Dialog open={showCurrencyModal} onOpenChange={setShowCurrencyModal}>
        <DialogContent className="bg-card border-card-border max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">
              Select Currency
            </DialogTitle>
          </DialogHeader>
          <div className="shrink-0 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={currencySearch}
                onChange={(e) => setCurrencySearch(e.target.value)}
                placeholder="Search currencies..."
                className="pl-9 bg-background border-input text-foreground"
              />
            </div>
          </div>
          <div
            className="overflow-y-auto flex-1 space-y-1 pr-1"
            style={{ scrollbarWidth: "thin" }}
          >
            {filteredCurrencies.map(([code, symbol]) => (
              <button
                key={code}
                onClick={() => {
                  setCurrency(code);
                  setShowCurrencyModal(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${currency === code ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"}`}
              >
                <span className="font-medium">{code}</span>
                <span className="text-lg">{symbol}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete all data modal */}
      <Dialog
        open={showDeleteModal}
        onOpenChange={(v) => {
          if (!isDeleting) {
            setShowDeleteModal(v);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="bg-card border-card-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete All Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              This will permanently delete all your{" "}
              <strong className="text-foreground">
                sales, expenses, and inventory
              </strong>
              . Your account and settings will remain.
            </p>
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-destructive">DELETE</strong> to
              confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="bg-background border-input text-foreground"
              disabled={isDeleting}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="cursor-pointer border-input"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAllData}
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                className="cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Everything"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

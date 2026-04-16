import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql, sum } from "drizzle-orm";
import { db, salesTable, expensesTable } from "@workspace/db";
import { GetDashboardStatsQueryParams, GetDashboardChartQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function localDateStr(now: Date, tzOffsetMinutes: number): string {
  const local = new Date(now.getTime() + tzOffsetMinutes * 60 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPeriodDates(
  period: string,
  clientLocalDate?: string,
  tzOffsetMinutes: number = 0,
): { startDate: string; endDate: string } {
  const now = new Date();
  const today = clientLocalDate ?? localDateStr(now, tzOffsetMinutes);

  if (period === "today") {
    return { startDate: today, endDate: today };
  }

  if (period === "week") {
    const anchor = new Date(today + "T00:00:00Z");
    const dayOfWeek = anchor.getUTCDay();
    const daysSinceSat = (dayOfWeek + 1) % 7;
    const startOfWeek = new Date(anchor);
    startOfWeek.setUTCDate(anchor.getUTCDate() - daysSinceSat);
    const y = startOfWeek.getUTCFullYear();
    const m = String(startOfWeek.getUTCMonth() + 1).padStart(2, "0");
    const d = String(startOfWeek.getUTCDate()).padStart(2, "0");
    return {
      startDate: `${y}-${m}-${d}`,
      endDate: today,
    };
  }

  if (period === "month") {
    const [yr, mo] = today.split("-").map(Number);
    return {
      startDate: `${yr}-${String(mo).padStart(2, "0")}-01`,
      endDate: today,
    };
  }

  if (period === "year") {
    const [yr] = today.split("-").map(Number);
    return {
      startDate: `${yr}-01-01`,
      endDate: today,
    };
  }

  return { startDate: today, endDate: today };
}

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const params = GetDashboardStatsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const { startDate, endDate } = getPeriodDates(params.data.period, params.data.localDate, params.data.tzOffset);

  const salesResult = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(${salesTable.sellPrice} * ${salesTable.quantity}), 0)`,
    totalProfit: sql<number>`COALESCE(SUM(${salesTable.profit}), 0)`,
    totalSales: sql<number>`COUNT(*)`,
    totalItems: sql<number>`COALESCE(SUM(${salesTable.quantity}), 0)`,
  }).from(salesTable).where(
    and(
      eq(salesTable.userId, userId),
      gte(salesTable.saleDate, startDate),
      lte(salesTable.saleDate, endDate)
    )
  );

  const expensesResult = await db.select({
    totalExpenses: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)`,
  }).from(expensesTable).where(
    and(
      eq(expensesTable.userId, userId),
      gte(expensesTable.expenseDate, startDate),
      lte(expensesTable.expenseDate, endDate)
    )
  );

  const totalRevenue = Number(salesResult[0]?.totalRevenue ?? 0);
  const totalProfit = Number(salesResult[0]?.totalProfit ?? 0);
  const totalExpenses = Number(expensesResult[0]?.totalExpenses ?? 0);

  res.json({
    totalRevenue,
    totalProfit,
    totalExpenses,
    netProfit: totalProfit - totalExpenses,
    totalSales: Number(salesResult[0]?.totalSales ?? 0),
    totalItems: Number(salesResult[0]?.totalItems ?? 0),
  });
});

router.get("/dashboard/chart", requireAuth, async (req, res): Promise<void> => {
  const params = GetDashboardChartQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const tzOffset = params.data.tzOffset ?? 0;
  const { startDate, endDate } = getPeriodDates(params.data.period, params.data.localDate, tzOffset);
  const period = params.data.period;

  if (period === "today") {
    const hours = [];
    for (let h = 0; h <= 23; h++) {
      const label = `${h.toString().padStart(2, "0")}:00`;
      const salesData = await db.select({
        revenue: sql<number>`COALESCE(SUM(${salesTable.sellPrice} * ${salesTable.quantity}), 0)`,
        profit: sql<number>`COALESCE(SUM(${salesTable.profit}), 0)`,
      }).from(salesTable).where(
        and(
          eq(salesTable.userId, userId),
          eq(salesTable.saleDate, startDate),
          sql`EXTRACT(HOUR FROM (${salesTable.createdAt} + (${tzOffset} * INTERVAL '1 minute'))) = ${h}`
        )
      );
      hours.push({
        label,
        revenue: Number(salesData[0]?.revenue ?? 0),
        profit: Number(salesData[0]?.profit ?? 0),
      });
    }
    res.json(hours);
    return;
  }

  if (period === "week") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    const startAnchor = new Date(startDate + "T00:00:00Z");
    for (let i = 0; i < 7; i++) {
      const d = new Date(startAnchor);
      d.setUTCDate(startAnchor.getUTCDate() + i);
      const yr = d.getUTCFullYear();
      const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dy = String(d.getUTCDate()).padStart(2, "0");
      const dateStr = `${yr}-${mo}-${dy}`;
      const dayName = days[d.getUTCDay()];
      const salesData = await db.select({
        revenue: sql<number>`COALESCE(SUM(${salesTable.sellPrice} * ${salesTable.quantity}), 0)`,
        profit: sql<number>`COALESCE(SUM(${salesTable.profit}), 0)`,
      }).from(salesTable).where(
        and(eq(salesTable.userId, userId), eq(salesTable.saleDate, dateStr))
      );
      result.push({
        label: dayName,
        revenue: Number(salesData[0]?.revenue ?? 0),
        profit: Number(salesData[0]?.profit ?? 0),
      });
    }
    res.json(result);
    return;
  }

  if (period === "month") {
    const [yr, mo] = startDate.split("-").map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yr}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const salesData = await db.select({
        revenue: sql<number>`COALESCE(SUM(${salesTable.sellPrice} * ${salesTable.quantity}), 0)`,
        profit: sql<number>`COALESCE(SUM(${salesTable.profit}), 0)`,
      }).from(salesTable).where(
        and(eq(salesTable.userId, userId), eq(salesTable.saleDate, dateStr))
      );
      result.push({
        label: `${d}`,
        revenue: Number(salesData[0]?.revenue ?? 0),
        profit: Number(salesData[0]?.profit ?? 0),
      });
    }
    res.json(result);
    return;
  }

  if (period === "year") {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const [yr] = startDate.split("-").map(Number);
    const result = [];
    for (let m = 1; m <= 12; m++) {
      const monthStart = `${yr}-${String(m).padStart(2, "0")}-01`;
      const monthEnd = `${yr}-${String(m).padStart(2, "0")}-${new Date(yr, m, 0).getDate()}`;
      const salesData = await db.select({
        revenue: sql<number>`COALESCE(SUM(${salesTable.sellPrice} * ${salesTable.quantity}), 0)`,
        profit: sql<number>`COALESCE(SUM(${salesTable.profit}), 0)`,
      }).from(salesTable).where(
        and(
          eq(salesTable.userId, userId),
          gte(salesTable.saleDate, monthStart),
          lte(salesTable.saleDate, monthEnd)
        )
      );
      result.push({
        label: months[m - 1],
        revenue: Number(salesData[0]?.revenue ?? 0),
        profit: Number(salesData[0]?.profit ?? 0),
      });
    }
    res.json(result);
    return;
  }

  res.json([]);
});

router.get("/dashboard/recent-sales", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const sales = await db.select().from(salesTable)
    .where(eq(salesTable.userId, userId))
    .orderBy(sql`${salesTable.saleDate} DESC, ${salesTable.createdAt} DESC`)
    .limit(5);

  res.json(sales.map(s => ({
    ...s,
    buyPrice: Number(s.buyPrice),
    sellPrice: Number(s.sellPrice),
    profit: Number(s.profit),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })));
});

export default router;

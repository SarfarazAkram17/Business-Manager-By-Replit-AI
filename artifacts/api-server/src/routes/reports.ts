import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, salesTable, expensesTable } from "@workspace/db";
import { GetMonthlyReportQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reports/monthly", requireAuth, async (req, res): Promise<void> => {
  const params = GetMonthlyReportQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const { month, year } = params.data;

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const [salesStats] = await db.select({
    totalRevenue: sql<number>`COALESCE(SUM(${salesTable.sellPrice} * ${salesTable.quantity}), 0)`,
    totalProfit: sql<number>`COALESCE(SUM(${salesTable.profit}), 0)`,
    totalSales: sql<number>`COUNT(*)`,
  }).from(salesTable).where(
    and(
      eq(salesTable.userId, userId),
      gte(salesTable.saleDate, monthStart),
      lte(salesTable.saleDate, monthEnd)
    )
  );

  const [expenseStats] = await db.select({
    totalExpenses: sql<number>`COALESCE(SUM(${expensesTable.amount}), 0)`,
  }).from(expensesTable).where(
    and(
      eq(expensesTable.userId, userId),
      gte(expensesTable.expenseDate, monthStart),
      lte(expensesTable.expenseDate, monthEnd)
    )
  );

  const allSales = await db.select().from(salesTable).where(
    and(
      eq(salesTable.userId, userId),
      gte(salesTable.saleDate, monthStart),
      lte(salesTable.saleDate, monthEnd)
    )
  ).orderBy(sql`${salesTable.saleDate} DESC`);

  const allExpenses = await db.select().from(expensesTable).where(
    and(
      eq(expensesTable.userId, userId),
      gte(expensesTable.expenseDate, monthStart),
      lte(expensesTable.expenseDate, monthEnd)
    )
  ).orderBy(sql`${expensesTable.expenseDate} DESC`);

  const chartData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayRevenue = allSales
      .filter(s => s.saleDate === dateStr)
      .reduce((acc, s) => acc + Number(s.sellPrice) * s.quantity, 0);
    const dayProfit = allSales
      .filter(s => s.saleDate === dateStr)
      .reduce((acc, s) => acc + Number(s.profit), 0);
    chartData.push({ label: String(d), revenue: dayRevenue, profit: dayProfit });
  }

  const topProductsMap: Record<string, { name: string; totalQuantity: number; totalRevenue: number; totalProfit: number; images: string[] }> = {};
  for (const sale of allSales) {
    if (!topProductsMap[sale.productName]) {
      topProductsMap[sale.productName] = {
        name: sale.productName,
        totalQuantity: 0,
        totalRevenue: 0,
        totalProfit: 0,
        images: [],
      };
    }
    topProductsMap[sale.productName].totalQuantity += sale.quantity;
    topProductsMap[sale.productName].totalRevenue += Number(sale.sellPrice) * sale.quantity;
    topProductsMap[sale.productName].totalProfit += Number(sale.profit);
    if (sale.images && sale.images.length > 0) {
      for (const img of sale.images) {
        if (!topProductsMap[sale.productName].images.includes(img)) {
          topProductsMap[sale.productName].images.push(img);
        }
      }
    }
  }
  const topProducts = Object.values(topProductsMap)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10);

  const totalRevenue = Number(salesStats.totalRevenue ?? 0);
  const totalProfit = Number(salesStats.totalProfit ?? 0);
  const totalExpenses = Number(expenseStats.totalExpenses ?? 0);

  res.json({
    month,
    year,
    totalRevenue,
    totalProfit,
    totalExpenses,
    netProfit: totalProfit - totalExpenses,
    totalSales: Number(salesStats.totalSales ?? 0),
    chartData,
    topProducts,
    sales: allSales.map(s => ({
      ...s,
      buyPrice: Number(s.buyPrice),
      sellPrice: Number(s.sellPrice),
      profit: Number(s.profit),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    expenses: allExpenses.map(e => ({
      ...e,
      amount: Number(e.amount),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    })),
  });
});

router.get("/reports/available-years", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;

  const salesYears = await db.selectDistinct({
    year: sql<number>`EXTRACT(YEAR FROM ${salesTable.saleDate})::int`,
  }).from(salesTable).where(eq(salesTable.userId, userId));

  const expenseYears = await db.selectDistinct({
    year: sql<number>`EXTRACT(YEAR FROM ${expensesTable.expenseDate})::int`,
  }).from(expensesTable).where(eq(expensesTable.userId, userId));

  const allYears = [
    ...new Set([
      ...salesYears.map(r => r.year),
      ...expenseYears.map(r => r.year),
    ]),
  ].filter(Boolean).sort((a, b) => a - b);

  if (allYears.length === 0) {
    allYears.push(new Date().getFullYear());
  }

  res.json(allYears);
});

export default router;

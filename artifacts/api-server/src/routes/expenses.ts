import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, expensesTable } from "@workspace/db";
import { CreateExpenseBody, UpdateExpenseBody, UpdateExpenseParams, DeleteExpenseParams, GetExpensesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/expenses", requireAuth, async (req, res): Promise<void> => {
  const params = GetExpensesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const conditions = [eq(expensesTable.userId, userId)];

  if (params.data.startDate) {
    conditions.push(gte(expensesTable.expenseDate, params.data.startDate));
  }
  if (params.data.endDate) {
    conditions.push(lte(expensesTable.expenseDate, params.data.endDate));
  }
  if (params.data.month != null && params.data.year != null) {
    conditions.push(sql`EXTRACT(MONTH FROM ${expensesTable.expenseDate}) = ${params.data.month}`);
    conditions.push(sql`EXTRACT(YEAR FROM ${expensesTable.expenseDate}) = ${params.data.year}`);
  } else if (params.data.year != null) {
    conditions.push(sql`EXTRACT(YEAR FROM ${expensesTable.expenseDate}) = ${params.data.year}`);
  }

  const expenses = await db.select().from(expensesTable)
    .where(and(...conditions))
    .orderBy(sql`${expensesTable.expenseDate} DESC, ${expensesTable.createdAt} DESC`);

  const result = expenses.map(e => ({
    ...e,
    amount: Number(e.amount),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  res.json(result);
});

router.post("/expenses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const { title, amount, category, notes, expenseDate } = parsed.data;

  const [expense] = await db.insert(expensesTable).values({
    userId,
    title,
    amount: String(amount),
    category: category ?? null,
    notes: notes ?? null,
    expenseDate,
  }).returning();

  res.status(201).json({
    ...expense,
    amount: Number(expense.amount),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  });
});

router.patch("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const existing = await db.select().from(expensesTable).where(
    and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId))
  );

  if (existing.length === 0) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  const updateData = parsed.data;
  const [expense] = await db.update(expensesTable)
    .set({
      ...(updateData.title && { title: updateData.title }),
      ...(updateData.amount !== undefined && { amount: String(updateData.amount) }),
      ...(updateData.category !== undefined && { category: updateData.category }),
      ...(updateData.notes !== undefined && { notes: updateData.notes }),
      ...(updateData.expenseDate && { expenseDate: updateData.expenseDate }),
    })
    .where(and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId)))
    .returning();

  res.json({
    ...expense,
    amount: Number(expense.amount),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  });
});

router.delete("/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteExpenseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [expense] = await db.delete(expensesTable).where(
    and(eq(expensesTable.id, params.data.id), eq(expensesTable.userId, userId))
  ).returning();

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

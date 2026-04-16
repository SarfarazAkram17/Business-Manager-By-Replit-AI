import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, salesTable, expensesTable, inventoryTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.delete("/user/data", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  await db.delete(salesTable).where(eq(salesTable.userId, userId));
  await db.delete(expensesTable).where(eq(expensesTable.userId, userId));
  await db.delete(inventoryTable).where(eq(inventoryTable.userId, userId));
  res.sendStatus(204);
});

export default router;

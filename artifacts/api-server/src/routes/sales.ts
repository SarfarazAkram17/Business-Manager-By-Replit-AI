import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, salesTable, inventoryTable } from "@workspace/db";
import { CreateSaleBody, UpdateSaleBody, GetSaleParams, UpdateSaleParams, DeleteSaleParams, GetSalesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/sales", requireAuth, async (req, res): Promise<void> => {
  const params = GetSalesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const conditions = [eq(salesTable.userId, userId)];

  if (params.data.startDate) {
    conditions.push(gte(salesTable.saleDate, params.data.startDate));
  }
  if (params.data.endDate) {
    conditions.push(lte(salesTable.saleDate, params.data.endDate));
  }
  if (params.data.month != null && params.data.year != null) {
    conditions.push(sql`EXTRACT(MONTH FROM ${salesTable.saleDate}) = ${params.data.month}`);
    conditions.push(sql`EXTRACT(YEAR FROM ${salesTable.saleDate}) = ${params.data.year}`);
  } else if (params.data.year != null) {
    conditions.push(sql`EXTRACT(YEAR FROM ${salesTable.saleDate}) = ${params.data.year}`);
  }

  const sales = await db.select().from(salesTable)
    .where(and(...conditions))
    .orderBy(sql`${salesTable.saleDate} DESC, ${salesTable.createdAt} DESC`);

  const result = sales.map(s => ({
    ...s,
    buyPrice: Number(s.buyPrice),
    sellPrice: Number(s.sellPrice),
    profit: Number(s.profit),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  res.json(result);
});

router.post("/sales", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const { productName, quantity, buyPrice, sellPrice, notes, images, inventoryItemId, saleDate } = parsed.data;

  const profit = (sellPrice - buyPrice) * quantity;

  const [sale] = await db.insert(salesTable).values({
    userId,
    productName,
    quantity,
    buyPrice: String(buyPrice),
    sellPrice: String(sellPrice),
    profit: String(profit),
    notes: notes ?? null,
    images: images ?? [],
    inventoryItemId: inventoryItemId ?? null,
    saleDate,
  }).returning();

  if (inventoryItemId) {
    await db.update(inventoryTable)
      .set({ quantity: sql`GREATEST(0, ${inventoryTable.quantity} - ${quantity})` })
      .where(and(eq(inventoryTable.id, inventoryItemId), eq(inventoryTable.userId, userId)));
  }

  res.status(201).json({
    ...sale,
    buyPrice: Number(sale.buyPrice),
    sellPrice: Number(sale.sellPrice),
    profit: Number(sale.profit),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  });
});

router.get("/sales/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [sale] = await db.select().from(salesTable).where(
    and(eq(salesTable.id, params.data.id), eq(salesTable.userId, userId))
  );

  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }

  res.json({
    ...sale,
    buyPrice: Number(sale.buyPrice),
    sellPrice: Number(sale.sellPrice),
    profit: Number(sale.profit),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  });
});

router.patch("/sales/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const existing = await db.select().from(salesTable).where(
    and(eq(salesTable.id, params.data.id), eq(salesTable.userId, userId))
  );

  if (existing.length === 0) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }

  const updateData = parsed.data;
  const buyPrice = updateData.buyPrice ?? Number(existing[0].buyPrice);
  const sellPrice = updateData.sellPrice ?? Number(existing[0].sellPrice);
  const quantity = updateData.quantity ?? existing[0].quantity;
  const profit = (sellPrice - buyPrice) * quantity;

  const [sale] = await db.update(salesTable)
    .set({
      ...(updateData.productName && { productName: updateData.productName }),
      ...(updateData.quantity !== undefined && { quantity: updateData.quantity }),
      ...(updateData.buyPrice !== undefined && { buyPrice: String(updateData.buyPrice) }),
      ...(updateData.sellPrice !== undefined && { sellPrice: String(updateData.sellPrice) }),
      profit: String(profit),
      ...(updateData.notes !== undefined && { notes: updateData.notes }),
      ...(updateData.images !== undefined && { images: updateData.images }),
      ...(updateData.inventoryItemId !== undefined && { inventoryItemId: updateData.inventoryItemId }),
      ...(updateData.saleDate && { saleDate: updateData.saleDate }),
    })
    .where(and(eq(salesTable.id, params.data.id), eq(salesTable.userId, userId)))
    .returning();

  // Adjust inventory stock based on quantity / item changes
  const oldQty = existing[0].quantity;
  const oldItemId = existing[0].inventoryItemId;
  const newQty = updateData.quantity ?? existing[0].quantity;
  const newItemId = updateData.inventoryItemId !== undefined
    ? updateData.inventoryItemId
    : existing[0].inventoryItemId;

  const itemChanged = newItemId !== oldItemId;

  if (itemChanged) {
    if (oldItemId) {
      await db.update(inventoryTable)
        .set({ quantity: sql`${inventoryTable.quantity} + ${oldQty}` })
        .where(and(eq(inventoryTable.id, oldItemId), eq(inventoryTable.userId, userId)));
    }
    if (newItemId) {
      await db.update(inventoryTable)
        .set({ quantity: sql`GREATEST(0, ${inventoryTable.quantity} - ${newQty})` })
        .where(and(eq(inventoryTable.id, newItemId), eq(inventoryTable.userId, userId)));
    }
  } else if (newItemId && newQty !== oldQty) {
    const diff = oldQty - newQty;
    await db.update(inventoryTable)
      .set({ quantity: sql`GREATEST(0, ${inventoryTable.quantity} + ${diff})` })
      .where(and(eq(inventoryTable.id, newItemId), eq(inventoryTable.userId, userId)));
  }

  res.json({
    ...sale,
    buyPrice: Number(sale.buyPrice),
    sellPrice: Number(sale.sellPrice),
    profit: Number(sale.profit),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  });
});

router.delete("/sales/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [sale] = await db.delete(salesTable).where(
    and(eq(salesTable.id, params.data.id), eq(salesTable.userId, userId))
  ).returning();

  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

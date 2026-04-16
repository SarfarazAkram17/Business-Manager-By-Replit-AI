import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, inventoryTable } from "@workspace/db";
import { CreateInventoryItemBody, UpdateInventoryItemBody, UpdateInventoryItemParams, DeleteInventoryItemParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/inventory", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const items = await db.select().from(inventoryTable)
    .where(eq(inventoryTable.userId, userId))
    .orderBy(inventoryTable.createdAt);

  const result = items.map(item => ({
    ...item,
    buyPrice: Number(item.buyPrice),
    sellPrice: Number(item.sellPrice),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  res.json(result);
});

router.post("/inventory", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const { name, quantity, buyPrice, sellPrice, description, images } = parsed.data;

  const [item] = await db.insert(inventoryTable).values({
    userId,
    name,
    quantity,
    buyPrice: String(buyPrice),
    sellPrice: String(sellPrice),
    description: description ?? null,
    images: images ?? [],
  }).returning();

  res.status(201).json({
    ...item,
    buyPrice: Number(item.buyPrice),
    sellPrice: Number(item.sellPrice),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });
});

router.patch("/inventory/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateInventoryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const existing = await db.select().from(inventoryTable).where(
    and(eq(inventoryTable.id, params.data.id), eq(inventoryTable.userId, userId))
  );

  if (existing.length === 0) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  const updateData = parsed.data;
  const [item] = await db.update(inventoryTable)
    .set({
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.quantity !== undefined && { quantity: updateData.quantity }),
      ...(updateData.buyPrice !== undefined && { buyPrice: String(updateData.buyPrice) }),
      ...(updateData.sellPrice !== undefined && { sellPrice: String(updateData.sellPrice) }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.images !== undefined && { images: updateData.images }),
    })
    .where(and(eq(inventoryTable.id, params.data.id), eq(inventoryTable.userId, userId)))
    .returning();

  res.json({
    ...item,
    buyPrice: Number(item.buyPrice),
    sellPrice: Number(item.sellPrice),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });
});

router.delete("/inventory/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteInventoryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.session.userId!;
  const [item] = await db.delete(inventoryTable).where(
    and(eq(inventoryTable.id, params.data.id), eq(inventoryTable.userId, userId))
  ).returning();

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

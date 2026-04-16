import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable, usersTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));

  if (!settings) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const [created] = await db.insert(settingsTable).values({
      userId,
      businessName: user?.businessName ?? "My Business",
      theme: "amethyst",
      currency: "BDT",
    }).returning();
    res.json({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
    return;
  }

  res.json({
    ...settings,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  });
});

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.session.userId!;
  const updateData = parsed.data;

  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));

  if (!existing) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const [created] = await db.insert(settingsTable).values({
      userId,
      businessName: updateData.businessName ?? user?.businessName ?? "My Business",
      theme: updateData.theme ?? "amethyst",
      currency: updateData.currency ?? "BDT",
    }).returning();
    res.json({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
    return;
  }

  const [settings] = await db.update(settingsTable)
    .set({
      ...(updateData.businessName && { businessName: updateData.businessName }),
      ...(updateData.theme && { theme: updateData.theme }),
      ...(updateData.currency && { currency: updateData.currency }),
    })
    .where(eq(settingsTable.userId, userId))
    .returning();

  if (updateData.businessName) {
    await db.update(usersTable)
      .set({ businessName: updateData.businessName })
      .where(eq(usersTable.id, userId));
  }

  res.json({
    ...settings,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  });
});

export default router;

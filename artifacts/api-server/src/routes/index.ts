import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import salesRouter from "./sales";
import expensesRouter from "./expenses";
import inventoryRouter from "./inventory";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import userRouter from "./user";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(salesRouter);
router.use(expensesRouter);
router.use(inventoryRouter);
router.use(settingsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(userRouter);

export default router;

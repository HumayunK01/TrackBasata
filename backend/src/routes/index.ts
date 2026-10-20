import { Router } from "express";
import healthRoutes from "./health.routes.js";
import categoryRoutes from "./category.routes.js";
import dailyLogRoutes from "./dailyLog.routes.js";
import facilityRoutes from "./facility.routes.js";
import trackerRoutes from "./tracker.routes.js";

const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/categories", categoryRoutes);
apiRouter.use("/logs", dailyLogRoutes);
apiRouter.use("/facilities", facilityRoutes);
apiRouter.use("/tracker", trackerRoutes);

export default apiRouter;

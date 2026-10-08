import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { proxyLogo, proxyFavicon } from "../controllers/proxy.controller.js";

const router = Router();

// Endpoints accessible as /api/logo or /api/v1/logo
router.get("/logo", asyncHandler(proxyLogo));
router.get("/favicon", asyncHandler(proxyFavicon));

export default router;

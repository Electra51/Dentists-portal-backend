import express from "express";
import {
  createTag,
  getTags,
  getTagById,
  updateTagById,
  deleteTagById,
} from "../controllers/tagController.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

// create a new tag
router.post("/tags", requireSignIn, createTag);
// get all categories
router.get("/tags", getTags);
// get a single tag by ID
router.get("/tags/:id", getTagById);
// update a tag by ID
router.put("/tags/:id", updateTagById);
// delete a tag by ID
router.delete("/tags/:id", deleteTagById);

export default router;

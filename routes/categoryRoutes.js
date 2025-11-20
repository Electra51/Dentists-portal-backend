import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategoryById,
  deleteCategoryById,
} from "../controllers/categoryController.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

// create a new category
router.post("/categories", createCategory);
// get all categories
router.get("/categories", getCategories);
// get a single category by ID
router.get("/categories/:id", getCategoryById);
// update a category by ID
router.put("/categories/:id", updateCategoryById);
// delete a category by ID
router.delete("/categories/:id", deleteCategoryById);

export default router;

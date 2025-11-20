import express from "express";
import {
  addComment,
  addRating,
  createBlogPost,
  deleteBlogPostController,
  findRelatedPostsByCategory,
  getAllBlogPostsController,
  getBlogPostByIdController,
  getBlogPostByUserId,
  getCategoryIdWisePosts,
  getCategoryWisePostsController,
  incrementShareCount,
  toggleReaction,
  updateBlogPostController,
  updatePostStatusController,
} from "../controllers/postController.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import { uploadImageController } from "../controllers/uploadImageController.js";

const router = express.Router();

// post a create blog
router.post("/posts", requireSignIn, createBlogPost);
// get blog by id
router.get("/posts/:id", getBlogPostByIdController);
// get blog by userid
router.get("/posts/user/:userId", getBlogPostByUserId);

// get blog
router.get("/posts", getAllBlogPostsController);
// delete blog by id
router.delete("/posts/:id", deleteBlogPostController);
// Update a blog post by ID
router.put("/posts/:id", requireSignIn, updateBlogPostController);
// image upload
router.use("/upload-image", uploadImageController);
router.patch("/posts/:id/status", updatePostStatusController);

router.post("/posts/:postId/add-comments", addComment);
router.post("/posts/:postId/add-rating", addRating);
router.post("/posts/:postId/toggleReaction", toggleReaction);
router.post("/posts/:postId/incrementShareCount", incrementShareCount);
router.get("/category-wise-posts", getCategoryWisePostsController);
router.get("/category-wise-posts/:categoryId", getCategoryIdWisePosts);
router.get("/posts/related/:categoryId", findRelatedPostsByCategory);

export default router;

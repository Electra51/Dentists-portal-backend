import postModel from "../models/postModel.js";
import tagModel from "../models/tagModel.js";
import mongoose from "mongoose";
import userModel from "../models/userModel.js";
import categoryModel from "../models/categoryModel.js";

//sigle post
export const getBlogPostByIdController = async (req, res) => {
  try {
    const postId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid post ID" });
    }

    const post = await postModel
      .findOne({ _id: new mongoose.Types.ObjectId(postId) })
      .populate("users")
      .populate("category")
      .populate("tags")
      .populate("comments.user")
      .select("-photo");

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    res.status(200).json({ success: true, message: "Post found", post });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error getting blog post",
      error: err.message,
    });
  }
};
// get all blog post
export const getAllBlogPostsController = async (req, res) => {
  try {
    const posts = await postModel
      .find({})
      .populate("category")
      .populate("users")
      .select("-photo")
      .limit(12)
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      message: "allpost",
      posts,
    });
  } catch (err) {
    console.log(err);
  }
};

//categorywise blog post
export const getCategoryWisePostsController = async (req, res) => {
  try {
    // Fetch all categories
    const categories = await categoryModel.find({});

    // Fetch posts for each category
    const categoryWisePosts = await Promise.all(
      categories.map(async (category) => {
        const posts = await postModel
          .find({ category: category._id })
          .select("-photo") // Exclude photo field
          .sort({ createdAt: -1 }); // Sort posts by creation date

        return {
          categoryName: category.name,
          posts,
          CountPost: posts.length, // Count of posts for this category
        };
      })
    );

    res.status(200).send({
      success: true,
      message: "Category-wise posts fetched successfully",
      data: categoryWisePosts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({
      success: false,
      message: "Error fetching category-wise posts",
      error: err.message,
    });
  }
};

export const getCategoryIdWisePosts = async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log(categoryId);
    // Validate categoryId
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Find posts by category
    const posts = await postModel
      .find({ category: categoryId })
      .populate("category", "name") // Optional: populate category name
      .populate("users", "nickname createdAt") // Optional: populate user details
      .exec();

    if (!posts.length) {
      return res.status(404).json({
        success: false,
        message: "No posts found for this category",
      });
    }

    // Respond with the posts
    return res.status(200).json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching category-wise posts:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

//user wise blogpost
export const getBlogPostByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("User ID received:", userId);

    const posts = await postModel
      .find({ users: new mongoose.Types.ObjectId(userId) })
      .populate("category")
      .populate("tags")

      .select("-photo")
      .sort({ createdAt: -1 })
      .limit(12);

    console.log("Posts found:", posts);

    res.status(200).json({
      success: true,
      message: `Posts by user ${userId}`,
      posts,
    });
  } catch (error) {
    console.error("Error fetching posts:", error.message);
    res.status(500).json({
      success: false,
      message: "Error fetching posts by user",
      error: error.message,
    });
  }
};

// create a blog post
export const createBlogPost = async (req, res) => {
  try {
    const { title, description, featuredImage, category, tags, users, status } =
      req.body;
    console.log("users", users);
    const tagDocuments = await Promise.all(
      tags.map(async (tagName) => {
        let tag = await tagModel.findOne({ name: tagName });

        if (!tag) {
          tag = new tagModel({ name: tagName });
          await tag.save();
        }

        return tag;
      })
    );
    const tagIds = tagDocuments.map(
      (tag) => new mongoose.Types.ObjectId(tag._id)
    );

    const blogPost = new postModel({
      title,
      description,
      category,
      tags: tagIds,
      featuredImage,
      status,
      users: new mongoose.Types.ObjectId(users),
    });

    await blogPost.save();

    res.status(201).json(blogPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating blog post" });
  }
};

// delete a blog post by ID
export const deleteBlogPostController = async (req, res) => {
  try {
    const postId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid post ID" });
    }

    const deletedPost = await postModel.findByIdAndDelete(postId);

    if (!deletedPost) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Post deleted", deletedPost });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error deleting blog post",
      error: err.message,
    });
  }
};

export const updateBlogPostController = async (req, res) => {
  try {
    const postId = req.params.id;

    // Validate post ID
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid post ID" });
    }

    // Find existing post
    const existingPost = await postModel.findById(postId);
    if (!existingPost) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const { title, description, featuredImage, category, tags } = req.body;

    const tagDocuments = await Promise.all(
      tags.map(async (tagName) => {
        let tag = await tagModel.findOne({ name: tagName });

        if (!tag) {
          tag = new tagModel({ name: tagName });
          await tag.save();
        }

        return tag;
      })
    );
    const tagIds = tagDocuments.map(
      (tag) => new mongoose.Types.ObjectId(tag._id)
    );

    const blogPost = new postModel({
      title,
      description,
      category,
      tags: tagIds,
      featuredImage,
    });

    await blogPost.save();

    // Update post fields
    existingPost.title = title || existingPost.title;
    existingPost.description = description || existingPost.description;
    existingPost.featuredImage = featuredImage || existingPost.featuredImage;
    existingPost.category = category || existingPost.category;
    existingPost.tags = tagIds.length > 0 ? tagIds : existingPost.tags;

    // Save updated post
    const updatedPost = await existingPost.save();

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating blog post",
      error: error.message,
    });
  }
};

//post status update
export const updatePostStatusController = async (req, res) => {
  const { id } = req.params;
  console.log("id", id);
  const { status } = req.body;

  // Define valid statuses
  const validStatuses = ["Trending", "Featured", "Reject", "Pending"];

  // Validate status input
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed statuses are: ${validStatuses.join(
        ", "
      )}`,
    });
  }

  try {
    // Find the post by ID
    const post = await postModel.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    // Update the status
    post.status = [status];
    await post.save();

    res.status(200).json({
      success: true,
      message: "Post status updated successfully.",
      post,
    });
  } catch (error) {
    console.error("Error updating post status:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the post status.",
    });
  }
};

export const addComment = async (req, res) => {
  try {
    const { postId, text, userId } = req.body;

    // Find the user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has the correct role
    if (user.role !== 0) {
      return res
        .status(403)
        .json({ error: "You are not allowed to add comments" });
    }

    // Find the post
    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Add the comment
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Comment text cannot be empty" });
    }

    post.comments.push({
      user: userId,
      text,
    });

    // Save the post
    await post.save();

    res.status(200).json({ message: "Comment added successfully", post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding comment" });
  }
};

export const addRating = async (req, res) => {
  try {
    const { postId, ratingValue, userId } = req.body;

    // Find the user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the post
    const post = await postModel.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user has already rated the post
    const existingRating = post.ratings.find(
      (rating) => rating.user.toString() === userId
    );

    if (existingRating) {
      // Update the existing rating
      existingRating.value = ratingValue / 2;
    } else {
      // Add a new rating
      post.ratings.push({
        user: userId,
        value: ratingValue / 2,
      });
    }

    // Recalculate the average rating
    const totalRating = post.ratings.reduce(
      (sum, rating) => sum + rating.value,
      0
    );
    post.averageRating = totalRating / post.ratings.length;

    // Save the post
    await post.save();

    res.status(200).json({ message: "Rating added successfully", post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding rating" });
  }
};

export const toggleReaction = async (req, res) => {
  console.log("Toggle reaction route is being hit!");
  try {
    const { postId, userId, reactionType } = req.body;
    console.log(
      "postId",
      postId,
      "userId",
      userId,
      "reactionType",
      reactionType
    );

    if (!postId || !userId || !reactionType) {
      return res
        .status(400)
        .json({ error: "Post ID, User ID, and Reaction Type are required" });
    }

    const post = await postModel.findById(postId).populate("users");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user has already reacted
    const existingReactionIndex = post.reactions.findIndex(
      (reaction) => reaction.user.toString() === userId
    );

    if (existingReactionIndex === -1) {
      // User hasn't reacted yet, so add the reaction
      post.reactions.push({ user: userId, type: reactionType });
    } else {
      // User has reacted, check if the reaction type matches
      if (post.reactions[existingReactionIndex].type === reactionType) {
        // Remove the reaction if it's the same type
        post.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update the reaction type
        post.reactions[existingReactionIndex].type = reactionType;
      }
    }

    await post.save();

    res.status(200).json({
      message: "Reaction updated successfully",
      reactions: post.reactions,
    });
  } catch (error) {
    console.error("Error in toggleReaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const incrementShareCount = async (req, res) => {
  try {
    const { postId, userId } = req.body;

    // Find the post by ID
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if the user has already shared the post
    if (post.sharedUsers.includes(userId)) {
      return res
        .status(200)
        .json({ message: "User has already shared this post" });
    }

    // Increment the share count and add the userId to sharedUsers
    post.shareCount = (post.shareCount || 0) + 1;
    post.sharedUsers.push(userId);

    await post.save();

    res.status(200).json({
      message: "Share count updated successfully",
      shareCount: post.shareCount,
    });
  } catch (error) {
    console.error("Error updating share count:", error);
    res.status(500).json({ error: "Error updating share count" });
  }
};

export const findRelatedPostsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params; // Get the category ID from the route parameters

    // Find related posts by category
    const relatedPosts = await postModel
      .find({ category: categoryId }) // Query by category ObjectId
      .limit(5) // Limit to 5 posts
      .populate("category")
      .populate("users"); // Populate category to fetch its name

    // If no related posts are found
    if (relatedPosts.length === 0) {
      return res
        .status(404)
        .json({ error: "No posts found for this category" });
    }

    // If related posts are found
    res.status(200).json({
      message: "Related posts found successfully",
      relatedPosts,
    });
  } catch (error) {
    console.error("Error finding related posts:", error);
    res.status(500).json({ error: "Error finding related posts" });
  }
};

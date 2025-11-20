import tagModel from "../models/tagModel.js";

// create a new tag
export const createTag = async (req, res) => {
  try {
    const tag = new tagModel(req.body);
    await tag.save();
    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get all tags
export const getTags = async (req, res) => {
  try {
    const tags = await tagModel.find().sort({ createdAt: -1 });
    res.status(200).json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get a single tag by ID
export const getTagById = async (req, res) => {
  try {
    const tag = await tagModel.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: "tag not found" });
    }
    res.status(200).json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// update a tag by ID
export const updateTagById = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    const tag = await tagModel.findByIdAndUpdate(
      req.params.id,
      { name, description, slug },
      { new: true }
    );
    if (!tag) {
      return res.status(404).json({ message: "tag not found" });
    }
    res.status(200).json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete a tag by ID
export const deleteTagById = async (req, res) => {
  try {
    const tag = await tagModel.findByIdAndDelete(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: "tag not found" });
    }
    res.status(200).json({ message: "tag deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

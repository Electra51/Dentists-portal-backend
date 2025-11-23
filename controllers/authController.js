import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import userModel from "../models/userModel.js";
import JWT from "jsonwebtoken";

export const registerController = async (req, res) => {
  try {
    const { name, email, password, googleId, role } = req.body;

    if (!googleId) {
      if (!name || !email || !password) {
        return res.status(400).send({ message: "All fields are required" });
      }
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).send({
        success: false,
        message: "User already registered. Please login.",
      });
    }
    let hashedPassword = null;
    if (!googleId) {
      hashedPassword = await hashPassword(password);
    }
    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      googleId,
      role: role || 0,
    });

    if (role === 1) {
      const notification = {
        message: `New author registration: ${name} (${email}).`,
        userId: user._id,
      };
    }
    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).send({
      success: true,
      message: "User registered successfully",
      user: safeUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error in registration",
      error: error.message,
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Email not registered. Please register first.",
      });
    }

    if (user.role !== Number(role)) {
      return res.status(403).send({
        success: false,
        message:
          "User role mismatch. You are trying to log in with the wrong role.",
      });
    }

    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(400).send({
        success: false,
        message: "Invalid password",
      });
    }

    const token = JWT.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).send({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error in login",
      error: error.message,
    });
  }
};

export const getUserProfileController = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(400).send({ message: "Unauthorized" });
    }

    const user = await userModel.findById(userId).select("-password");

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).send({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

export const updateUserProfileController = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    // Password update prevent koro (separate route e korbe)
    delete updateData.password;
    delete updateData.email; // Email change prevent
    delete updateData.role; // Role change prevent

    const updatedUser = await userModel
      .findByIdAndUpdate(userId, updateData, { new: true, runValidators: true })
      .select("-password");

    if (!updatedUser) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).send({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

export const getUserDetailsController = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).send({ message: "Email is required" });
    }

    const user = await userModel.findOne({ email }).select("-password");

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // If user exists, return user details
    res.status(200).send({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error fetching user details",
      error: error.message,
    });
  }
};

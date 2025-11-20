import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import userModel from "../models/userModel.js";
import JWT from "jsonwebtoken";

export const registerController = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.send({ message: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return res
        .status(400)
        .send({ success: false, message: "Passwords do not match" });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res
        .status(200)
        .send({ success: false, message: "Already registered. Please login." });
    }

    const hashedPassword = await hashPassword(password);
    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      role: role || 0,
    });

    // Notify admin if the user is an author
    if (role === 1) {
      // Store notification in the database or send via a notification system
      const notification = {
        message: `New author registration: ${name} (${email}).`,
        userId: user._id,
      };
      // Save to notification model (implement a notification schema if needed)
    }

    res.status(201).send({
      success: true,
      message: "User registered successfully",
      user,
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
    const { email, password } = req.body;

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

    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(400).send({
        success: false,
        message: "Invalid password",
      });
    }

    // Include `isVerified` in the response
    const token = JWT.sign(
      { _id: user._id, role: user.role, isVerified: user.isVerified },
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
        isVerified: user.isVerified,
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

// export const getAllAuthorsController = async (req, res) => {
//   try {
//     // Query to find users with role 1 (author)
//     const authors = await userModel.find({ role: 1 }).select("-password");

//     if (!authors || authors.length === 0) {
//       return res.status(404).send({
//         success: false,
//         message: "No authors found",
//       });
//     }

//     // If authors exist, return the list of authors
//     res.status(200).send({
//       success: true,
//       authors,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching authors",
//       error: error.message,
//     });
//   }
// };

export const getAllAuthorsController = async (req, res) => {
  try {
    const authors = await userModel
      .find({ role: 1 })
      .select("-password")
      .sort({ createdAt: -1 });

    if (!authors || authors.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No authors found",
      });
    }

    res.status(200).send({
      success: true,
      authors,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error fetching authors",
      error: error.message,
    });
  }
};

export const verifyAuthorController = async (req, res) => {
  try {
    const { authorId } = req.body;
    console.log("req", req);
    // // Ensure only admins can verify authors
    // if (req.user.role !== 2) {
    //   return res.status(403).send({
    //     success: false,
    //     message: "Access denied. Only admins can verify authors.",
    //   });
    // }

    // Fetch and verify the author
    const author = await userModel.findById(authorId);
    if (!author || author.role !== 1) {
      return res.status(404).send({
        success: false,
        message: "Author not found or not valid.",
      });
    }

    // Update the verification status
    author.isVerified = true;
    await author.save();

    res.status(200).send({
      success: true,
      message: "Author verified successfully.",
    });
  } catch (error) {
    console.error("Error verifying author:", error);
    res.status(500).send({
      success: false,
      message: "Error verifying author.",
      error: error.message,
    });
  }
};

export const requestVerificationController = async (req, res) => {
  try {
    const { userId } = req.body;

    // Ensure the user is an author
    const author = await userModel.findById(userId);
    if (!author || author.role !== 1) {
      return res.status(404).send({
        success: false,
        message: "Author not found.",
      });
    }

    // Notify the admin about the request
    const notification = {
      message: `Author ${author.name} (${author.email}) requested verification.`,
      userId: author._id,
    };
    // Save to notification model or system

    res.status(200).send({
      success: true,
      message: "Verification request sent successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error sending verification request.",
      error: error.message,
    });
  }
};

// export const updateUserProfileController = async (req, res) => {
//   try {
//     const { email } = req.params;
//     const { nickname } = req.body;

//     if (!email) {
//       return res.status(400).send({ message: "Email is required" });
//     }

//     // Find the user by email
//     const user = await userModel.findOne({ email });

//     if (!user) {
//       return res.status(404).send({
//         success: false,
//         message: "User not found",
//       });
//     }

//     // Update user fields
//     if (nickname) user.nickname = nickname;

//     // If a file was uploaded, update profileImage with the new URL
//     if (req.file) {
//       const imageUrl = `${
//         process.env.BASE_URL || "http://localhost:8080"
//       }${req.file.path.replace("public", "")}`;
//       user.profileImage = imageUrl;
//     }

//     // Save the updated user data
//     await user.save();

//     res.status(200).send({
//       success: true,
//       message: "User profile updated successfully",
//       user,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Error updating user profile",
//       error: error.message,
//     });
//   }
// };

//forgotPasswordController
export const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).send({ message: "Email is required" });
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not existed",
      });
    }
    const secret = process.env.JWT_SECRET + user.password;

    const token = await JWT.sign({ _id: user._id, email: user.email }, secret, {
      expiresIn: "15m",
    });

    const link = `http://localhost:5173/reset_password/${user._id}/${token}`;
    console.log(link);
    res.send("Password reset link has been sent");
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

export const getresetController = async (req, res) => {
  try {
    const { id, token } = req.params;

    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Verify the token
    const secret = process.env.JWT_SECRET + user.password;

    try {
      const payload = JWT.verify(token, secret);

      res.render("reset-password", { email: user.email });
    } catch (error) {
      console.log(error);
      return res.status(401).send({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

export const postresetController = async (req, res) => {
  try {
    const { id, token } = req.params;
    const { password, password2 } = req.body;

    if (password !== password2) {
      return res.status(400).send({
        success: false,
        message: "Passwords do not match",
      });
    }

    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const secret = process.env.JWT_SECRET + user.password;

    try {
      const payload = JWT.verify(token, secret);

      user.password = await hashPassword(password);
      await user.save();

      return res.status(200).send({
        success: true,
        message: "Password reset successful",
      });
    } catch (error) {
      console.log(error);
      return res.status(401).send({
        success: false,
        message: "Invalid or expired token",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong",
      error,
    });
  }
};

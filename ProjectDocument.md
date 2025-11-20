Project Document - BlueSky Blog Web Application

Introduction:
This document outlines the structure, technologies, and components of the BlueSky blog web application's server-side code. The application is implemented using Node.js, Express.js, and MongoDB, following the MVC pattern for a well-organized structure.

Project Folder Structure:

1.config folder:

-db.js: Manages the connection between Mongoose and Node.js, ensuring a seamless interaction with the MongoDB database.

2.models folder:

-userModel.js, tagModel.js, postModel.js, categoryModel.js: Define schema models for users, tags, posts, and categories, respectively.

3.helper folder:

-authHelper.js: Contains functions for hashing passwords, enhancing the security of user credentials.

4.middleware folder:

-authMiddleware.js: Implements JWT token-based authentication for secure access to routes.

5.route folder:

-authRoute.js, categoryRoutes.js, postRoutes.js, tagRoutes.js: Define routes for authentication, category-related operations, post-related operations, and tag-related operations, respectively.
controller folder:

-Contains files with business logic for handling various functionalities.

4.env file:

MONGO_URL: Specifies the MongoDB connection URL.
DEV_MODE: Manages the development mode settings.
JWT_SECRET: Secret key for encoding and decoding JWT tokens.
Server file:

Main entry point for the application, where routes and middleware are configured.

Technologies Used:
bcrypt: Used for password hashing to enhance security.
colors: Enhances console log messages with colored output for better readability.
concurrently: Enables concurrent execution of multiple commands, facilitating smoother development workflows.
cors: Manages Cross-Origin Resource Sharing to allow secure communication between the server and client.
dotenv: Allows loading environment variables from a .env file.
express: The Node.js framework used for building robust and scalable web applications.
express-formidable: Handles form data and file uploads in Express applications.
express-validator: Provides validation middleware for Express applications, ensuring data integrity.
jsonwebtoken: Implements JSON Web Tokens for secure user authentication.
mongoose: An Object Document Model (ODM) library for MongoDB and Node.js, simplifying database interactions.
morgan: Middleware for logging HTTP requests for debugging and monitoring.
multer: Manages file uploads in Express applications.
nodemailer: Facilitates sending emails from the Node.js application.
nodemon: Monitors changes in the source code and automatically restarts the server during development.
sharp: A high-performance image processing library.
slugify: Converts strings into slugs for better URL readability.

Project Run:
-git clone project_url
-npm i
-npm start

Conclusion:
This project document provides a comprehensive overview of the BlueSky blog web application's server-side code, including its structure, technologies used, and key components. Developers can refer to this document for a deeper understanding of the application's architecture and functionality.

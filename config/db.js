// import mongoose from "mongoose";
// import colors from "colors";
// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URL);
//     console.log(
//       `Conneted To Mongodb Databse ${conn.connection.host}`.bgYellow.white
//     );
//   } catch (error) {
//     console.log(`Errro in Mongodb ${error}`.bgRed.white);
//   }
// };

// export default connectDB;

import mongoose from "mongoose";
import colors from "colors";

// Global variable to cache the connection
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If already connected, return the cached connection
  if (cached.conn) {
    console.log("Using cached database connection".bgGreen.white);
    return cached.conn;
  }

  // If no promise exists, create a new connection
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s
    };

    try {
      cached.promise = mongoose
        .connect(process.env.MONGO_URL, opts)
        .then((mongoose) => {
          console.log(
            `Connected To MongoDB Database ${mongoose.connection.host}`.bgYellow
              .white
          );
          return mongoose;
        });
    } catch (error) {
      console.log(`Error in MongoDB ${error}`.bgRed.white);
      cached.promise = null;
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

export default connectDB;

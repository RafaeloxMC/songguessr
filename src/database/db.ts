import mongoose from "mongoose";

let conn: mongoose.Connection | null = null;

export async function connectDB() {
    if (!conn || conn.readyState !== 1) {
        const mongooseInstance = await mongoose.connect(
            process.env.DB_URI || "mongodb://localhost:27017/mydatabase",
            {
                serverSelectionTimeoutMS: 5000,
            }
        );
        if (mongooseInstance.connection.readyState !== 1) {
            throw new Error("Failed to connect to MongoDB");
        }
        conn = mongooseInstance.connection;
    }
}

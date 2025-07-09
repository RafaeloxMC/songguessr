import mongoose from "mongoose";

let conn: mongoose.Connection | null = null;
let connecting = false;

export async function connectDB() {
    if (conn && conn.readyState === 1) {
        return;
    }

    if (connecting) {
        while (connecting) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return;
    }

    if (conn && (conn.readyState === 3 || conn.readyState === 99)) {
        conn = null;
    }

    try {
        connecting = true;

        const mongooseInstance = await mongoose.connect(
            process.env.DB_URI || "mongodb://localhost:27017/mydatabase",
            {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                bufferCommands: false,
                maxPoolSize: 10,
                minPoolSize: 5,
            }
        );

        if (mongooseInstance.connection.readyState !== 1) {
            throw new Error("Failed to connect to MongoDB");
        }

        conn = mongooseInstance.connection;

        conn.on("error", (err) => {
            console.error("MongoDB connection error:", err);
            conn = null;
        });

        conn.on("disconnected", () => {
            console.log("MongoDB disconnected");
            conn = null;
        });
    } catch (error) {
        console.error("Database connection failed:", error);
        conn = null;
        throw error;
    } finally {
        connecting = false;
    }
}

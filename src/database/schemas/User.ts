import { Document, model, models, Schema, Types } from "mongoose";

export interface IUser extends Document {
    _id: Types.ObjectId;
    username: string;
    email: string;
    password: string;
    totalScore: number;
    gamesPlayed: number;
    gamesWon: number;
    averageScore: number;
    bestScore: number;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 20,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please enter a valid email",
            ],
        },
        password: { 
            type: String, 
            required: true, 
            minlength: 8,
            match: [
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
                "Password must be at least 8 characters long and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol."
            ]
        },
        totalScore: { type: Number, default: 0, min: 0 },
        gamesPlayed: { type: Number, default: 0, min: 0 },
        gamesWon: { type: Number, default: 0, min: 0 },
        averageScore: { type: Number, default: 0, min: 0 },
        bestScore: { type: Number, default: 0, min: 0 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

UserSchema.virtual("winRate").get(function (this: IUser) {
    return this.gamesPlayed > 0 ? (this.gamesWon / this.gamesPlayed) * 100 : 0;
});

export default models.User || model<IUser>("User", UserSchema);

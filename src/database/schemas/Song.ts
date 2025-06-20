import { Difficulty } from "@/util/enums/Difficulty";
import { extractSoundCloudTrackId, isValidSoundCloudUrl } from "@/util/SCUtils";
import { Document, Schema, model, models } from "mongoose";

export interface ISong extends Document {
    _id: string;
    soundcloudUrl: string;
    soundcloudTrackId: string;
    title?: string;
    artist?: string;
    difficulty: Difficulty;
    startingOffset?: number;
    playCount: number;
    correctGuesses: number;
    isActive: boolean;

    releaseYear?: number;
    genres?: string[];
    mood?: string;
    energy?: "low" | "medium" | "high";
    popularityRange?: "mainstream" | "underground" | "viral";

    createdAt: Date;
    updatedAt: Date;
}

const SongSchema = new Schema<ISong>(
    {
        soundcloudUrl: {
            type: String,
            required: true,
            unique: true,
            index: true,
            validate: {
                validator: function (url: string) {
                    return isValidSoundCloudUrl(url);
                },
                message: "Invalid SoundCloud URL format",
            },
        },
        soundcloudTrackId: {
            type: String,
            required: false,
            index: true,
        },
        title: { type: String, trim: true },
        artist: { type: String, trim: true },
        difficulty: {
            type: String,
            enum: Object.values(Difficulty),
            default: Difficulty.MEDIUM,
        },
        startingOffset: { type: Number, default: 0, min: 0 },
        playCount: { type: Number, default: 0, min: 0 },
        correctGuesses: { type: Number, default: 0, min: 0 },
        isActive: { type: Boolean, default: true },

        releaseYear: {
            type: Number,
            min: 1900,
            max: 2030,
        },
        genres: [
            {
                type: String,
                lowercase: true,
                trim: true,
            },
        ],
        mood: {
            type: String,
            lowercase: true,
            trim: true,
        },
        energy: {
            type: String,
            enum: ["low", "medium", "high"],
        },
        popularityRange: {
            type: String,
            enum: ["mainstream", "underground", "viral"],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

SongSchema.virtual("successRate").get(function (this: ISong) {
    return this.playCount > 0
        ? (this.correctGuesses / this.playCount) * 100
        : 0;
});

SongSchema.index({ artist: 1, title: 1 });
SongSchema.index({ difficulty: 1 });
SongSchema.index({ releaseYear: 1 });
SongSchema.index({ genres: 1 });
SongSchema.index({ energy: 1 });
SongSchema.index({ popularityRange: 1 });

SongSchema.pre("save", function (this: ISong) {
    if (this.soundcloudUrl && !this.soundcloudTrackId) {
        try {
            this.soundcloudTrackId = extractSoundCloudTrackId(
                this.soundcloudUrl
            );
        } catch {}
    }
});

export default models.Song || model<ISong>("Song", SongSchema);

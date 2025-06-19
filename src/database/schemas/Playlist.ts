import { MapType } from "@/util/enums/PlaylistType";
import { Document, Types, Schema, model, models } from "mongoose";

export interface IPlaylist extends Document {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    playlistType: MapType;
    isActive: boolean;
    songCount: number;
    playCount: number;
    averageRating: number;
    tags: string[];

    selectionType: "dynamic" | "manual";

    songIds?: Types.ObjectId[];

    metadata?: {
        startYear?: number;
        endYear?: number;
        genres?: string[];
        artists?: string[];
        mood?: string;
        energy?: "low" | "medium" | "high";
        popularityRange?: "mainstream" | "underground" | "viral";
        customCriteria?: unknown;
    };

    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        imageUrl: {
            type: String,
            trim: true,
        },
        playlistType: {
            type: String,
            enum: Object.values(MapType),
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        songCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        playCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        tags: [
            {
                type: String,
                trim: true,
            },
        ],
        selectionType: {
            type: String,
            enum: ["dynamic", "manual"],
            required: true,
            default: "dynamic",
        },
        songIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "Song",
            },
        ],
        metadata: {
            startYear: {
                type: Number,
                min: 1900,
                max: 2030,
            },
            endYear: {
                type: Number,
                min: 1900,
                max: 2030,
            },
            genres: [String],
            artists: [String],
            mood: String,
            energy: {
                type: String,
                enum: ["low", "medium", "high"],
            },
            popularityRange: {
                type: String,
                enum: ["mainstream", "underground", "viral"],
            },
            customCriteria: Schema.Types.Mixed,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

PlaylistSchema.index({ playlistType: 1, isActive: 1 });
PlaylistSchema.index({ selectionType: 1 });
PlaylistSchema.index({ "metadata.startYear": 1, "metadata.endYear": 1 });
PlaylistSchema.index({ "metadata.genres": 1 });

PlaylistSchema.virtual("hasSongs").get(function (this: IPlaylist) {
    if (this.selectionType === "manual") {
        return this.songIds && this.songIds.length > 0;
    }
    return true;
});

PlaylistSchema.pre("save", function (this: IPlaylist) {
    if (this.selectionType === "manual" && this.songIds) {
        this.songCount = this.songIds.length;
    }
});

export default models.Playlist || model<IPlaylist>("Playlist", PlaylistSchema);

import { Document, Schema, model, models, Types } from "mongoose";
import { GameMode } from "@/util/enums/GameMode";
import { GameStatus } from "@/util/enums/GameStatus";

export interface IGameRound {
    songId: Types.ObjectId;
    userGuess?: string;
    correctAnswer: string;
    isCorrect: boolean;
    hintsUsed: number;
    timeToGuess?: number;
    pointsEarned: number;
    roundStartTime: Date;
    roundEndTime?: Date;
}

export interface IGameSession extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    playlistId: Types.ObjectId;
    gameMode: GameMode;
    status: GameStatus;

    totalRounds: number;
    currentRound: number;

    totalScore: number;
    maxPossibleScore: number;

    rounds: IGameRound[];

    sessionStartTime: Date;
    sessionEndTime?: Date;
    totalGameTime?: number;

    clientSessionId: string;
    lastActionTime: Date;
    isValid: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const GameRoundSchema = new Schema<IGameRound>({
    songId: {
        type: Schema.Types.ObjectId,
        ref: "Song",
        required: true,
    },
    userGuess: {
        type: String,
        trim: true,
    },
    correctAnswer: {
        type: String,
        required: true,
        trim: true,
    },
    isCorrect: {
        type: Boolean,
        required: true,
        default: false,
    },
    hintsUsed: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    timeToGuess: {
        type: Number,
        min: 0,
    },
    pointsEarned: {
        type: Number,
        required: true,
        min: 0,
        max: 5,
    },
    roundStartTime: {
        type: Date,
        required: true,
        default: Date.now,
    },
    roundEndTime: {
        type: Date,
    },
});

const GameSessionSchema = new Schema<IGameSession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        playlistId: {
            type: Schema.Types.ObjectId,
            ref: "Playlist",
            required: true,
            index: true,
        },
        gameMode: {
            type: String,
            enum: Object.values(GameMode),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(GameStatus),
            required: true,
            default: GameStatus.ACTIVE,
        },
        totalRounds: {
            type: Number,
            required: true,
            min: 1,
            max: 20,
        },
        currentRound: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
        },
        totalScore: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        maxPossibleScore: {
            type: Number,
            required: true,
            min: 0,
        },
        rounds: [GameRoundSchema],
        sessionStartTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        sessionEndTime: {
            type: Date,
        },
        totalGameTime: {
            type: Number,
            min: 0,
        },
        clientSessionId: {
            type: String,
            required: true,
            index: true,
        },
        lastActionTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        isValid: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

GameSessionSchema.index({ userId: 1, status: 1 });
GameSessionSchema.index({ playlistId: 1, gameMode: 1 });
GameSessionSchema.index({ sessionStartTime: -1 });
GameSessionSchema.index({ clientSessionId: 1, userId: 1 });

GameSessionSchema.virtual("accuracy").get(function (this: IGameSession) {
    const completedRounds = this.rounds.filter((round) => round.roundEndTime);
    if (completedRounds.length === 0) return 0;
    const correctRounds = completedRounds.filter((round) => round.isCorrect);
    return (correctRounds.length / completedRounds.length) * 100;
});

GameSessionSchema.virtual("averageTimePerRound").get(function (
    this: IGameSession
) {
    const completedRounds = this.rounds.filter(
        (round) => round.roundEndTime && round.timeToGuess
    );
    if (completedRounds.length === 0) return 0;
    const totalTime = completedRounds.reduce(
        (sum, round) => sum + (round.timeToGuess || 0),
        0
    );
    return totalTime / completedRounds.length;
});

GameSessionSchema.virtual("averageHintsUsed").get(function (
    this: IGameSession
) {
    if (this.rounds.length === 0) return 0;
    const totalHints = this.rounds.reduce(
        (sum, round) => sum + round.hintsUsed,
        0
    );
    return totalHints / this.rounds.length;
});

GameSessionSchema.pre("save", function (this: IGameSession) {
    this.lastActionTime = new Date();

    if (this.status === GameStatus.COMPLETED && this.sessionEndTime) {
        this.totalGameTime =
            this.sessionEndTime.getTime() - this.sessionStartTime.getTime();
    }

    this.maxPossibleScore = this.totalRounds * 5;
});

export default models.GameSession ||
    model<IGameSession>("GameSession", GameSessionSchema);

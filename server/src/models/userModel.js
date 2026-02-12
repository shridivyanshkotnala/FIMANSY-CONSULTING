import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: function () {
                // password is REQUIRED only for local auth
                return this.authProvider === "local";
            },
        },

        fullName: {
            type: String,
            trim: true,
            maxlength: 150,
        },
        googleId: {type: String, unique: true, sparse: true}, // allows multiple null values

        authProvider: {
            type: String,
            enum: ["local", "google"],
            default: "local",
            index: true,
        },

        role: {
            type: String,
            enum: ["founder", "admin"],
            default: "founder",
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        emailVerified: {
            type: Boolean,
            default: false,
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },

        refreshToken: {
            type: String,
        },

        tokenVersion: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true, // createdAt, updatedAt
    }
);


userSchema.pre("save", async function () {
    // we cannot use arrow function here as we need to access `this` (the document)
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10); // 10 salt rounds
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password); // this.password is the hashed password stored in the database and password is the plain text password entered by the user
    // so the parameter password is the plain text password entered by the user in the function call
}


// JWT Token Generation Methods
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            tokenVersion: this.tokenVersion
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            tokenVersion: this.tokenVersion
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}

export const User = mongoose.model("User", userSchema);

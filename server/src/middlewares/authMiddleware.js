import jwt from "jsonwebtoken";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/userModel.js";

const protectRoute = asynchandler(async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace(/^Bearer\s+/i, "") ||
            req.header("x-access-token");

        if (!token) {
            throw new ApiError(401, "Access token not found, unauthorized access");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Invalid token, user not found");
        }

        if (decodedToken.tokenVersion !== user.tokenVersion) {
            throw new ApiError(401, "Token expired");
        }

        req.user = user;

        next();
    } catch (error) {
        throw new ApiError(401, "Invalid or expired token, unauthorized access");
    }
});

export { protectRoute };
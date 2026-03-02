import jwt from "jsonwebtoken";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/userModel.js";

const protectRoute = asynchandler(async (req, res, next) => {
    try {
        console.log("Headers:", req.headers); // Debug: Check headers
        console.log("Cookies:", req.cookies); // Debug: Check cookies

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        console.log("Extracted token:", token ? "Token present" : "No token"); // Debug: Check if token exists

        if (!token) {
            throw new ApiError(401, "Access token not found, unauthorized access");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("Decoded token:", decodedToken); // Debug: Check decoded token

        const user = await User.findById(decodedToken._id).select("-password -refreshToken");
        console.log("Found user:", user ? "User found" : "User not found"); // Debug: Check if user exists

        if (!user) {
            throw new ApiError(401, "Invalid token, user not found");
        }

        if (decodedToken.tokenVersion !== user.tokenVersion) {
            throw new ApiError(401, "Token expired");
        }

        req.user = user;
        console.log("req.user set:", req.user._id); // Debug: Confirm req.user is set
        
        next();
    } catch (error) {
        console.error("Auth middleware error:", error.message); // Debug: Log any errors
        throw new ApiError(401, "Invalid or expired token, unauthorized access");
    }
});

export { protectRoute };
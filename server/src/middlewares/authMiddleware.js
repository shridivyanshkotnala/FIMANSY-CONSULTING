
import jwt from "jsonwebtoken";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/userModel.js";


const protectRoute = asynchandler(async (req, res, next) => {
    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "") //extracting token from cookies or authorization header

        if (!token) {
            throw new ApiError(401, "Access token not found, unauthorized access")

        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) //verifying token using secret key)

        const user = await User.findById(decodedToken._id).select("-password -refreshToken") //fetching user from database excluding password and refresh token

        if (!user) {
            throw new ApiError(401, "Invalid token, user not found")
        }


        if (decodedToken.tokenVersion !== user.tokenVersion) {
            throw new ApiError(401, "Token expired");
        }

        req.user = user //attaching user object to request object for further use in protected routes

        next() //proceed to next middleware or route handler


    } catch (error) {
        throw new ApiError(401, "Invalid or expired token, unauthorized access")
    }
})



export { protectRoute}
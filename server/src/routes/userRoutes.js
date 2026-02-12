import express from "express";
import { registerUser, loginUser, refreshToken, logoutUser } from "../controllers/userController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";

const userRoute = express.Router();

userRoute.post("/register", registerUser)
userRoute.post("/login", loginUser)
userRoute.post("/logout", protectRoute, logoutUser)
userRoute.post("/refresh-token", refreshToken)
userRoute.post("/change-password", protectRoute, changeUserPassword)

export default userRoute;
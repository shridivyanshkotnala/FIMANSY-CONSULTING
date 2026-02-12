import express from "express";
import passport from "passport";

import { registerUser, loginUser, refreshToken, logoutUser } from "../controllers/userController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { validateSignup } from "../validators/userValidator.js";
import { validateLogin } from "../validators/userValidator.js";
import { validateLogout } from "../validators/userValidator.js";
import { validateChangePassword } from "../validators/userValidator.js";
import { changeUserPassword } from "../controllers/userController.js";
import { refreshRefreshToken } from "../controllers/userController.js";
import { googleAuthCallback } from "../controllers/userController.js";
const userRoute = express.Router();

userRoute.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);


userRoute.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  googleAuthCallback
);


userRoute.post("/register", validateSignup, registerUser)
userRoute.post("/login", validateLogin, loginUser)
userRoute.post("/logout", protectRoute, validateLogout, logoutUser)
userRoute.post("/refresh-token", refreshToken)
userRoute.post("/change-password", protectRoute, validateChangePassword, changeUserPassword)

export default userRoute;
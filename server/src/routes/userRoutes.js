import express from "express";
import passport from "passport";

import { registerUser, loginUser,  logoutUser } from "../controllers/userController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { validateSignup } from "../validators/userValidator.js";
import { validateLogin } from "../validators/userValidator.js";
import { validateLogout } from "../validators/userValidator.js";
import { validateChangePassword } from "../validators/userValidator.js";
import { changeUserPassword } from "../controllers/userController.js";
import { refreshRefreshToken } from "../controllers/userController.js";
import { googleAuthCallback } from "../controllers/userController.js";
import { getMe } from "../controllers/userController.js";
import { completeOnboarding } from "../controllers/userController.js";

const userRoute = express.Router();

const isGoogleOAuthConfigured =
  !!process.env.GOOGLE_CLIENT_ID &&
  !!process.env.GOOGLE_CLIENT_SECRET &&
  !!process.env.GOOGLE_CALLBACK_URL;

if (isGoogleOAuthConfigured) {
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
} else {
  userRoute.get("/google", (_req, res) => {
    res.status(503).json({
      message: "Google OAuth is not configured on server",
    });
  });

  userRoute.get("/google/callback", (_req, res) => {
    res.status(503).json({
      message: "Google OAuth is not configured on server",
    });
  });
}


userRoute.post("/register", validateSignup, registerUser)
userRoute.post("/login", validateLogin, loginUser)
userRoute.post("/logout", protectRoute, validateLogout, logoutUser)
userRoute.post("/refresh-token", refreshRefreshToken)
userRoute.post("/change-password", protectRoute, validateChangePassword, changeUserPassword)
userRoute.get("/me", protectRoute, getMe)
userRoute.post("/onboarding", protectRoute, completeOnboarding);

export default userRoute;
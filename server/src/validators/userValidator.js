import joi from "joi";
import { validateUser } from "../middlewares/validateMiddleware.js";

const signupSchema = joi.object({
    email : joi.string().email().required(),
    password : joi.string().min(3).max(100).required(),
    confirmPassword : joi.string().valid(joi.ref("password")).required().messages({
        "any.only" : "Confirm password must match password"
    }),
    fullName : joi.string().min(3).max(150).required()
});

const loginSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required(),
});

const changePasswordSchema = joi.object({
  currentPassword: joi.string().required(),

  newPassword: joi.string().min(6).max(100).required(),

  confirmNewPassword: joi
    .string()
    .valid(joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "New passwords do not match",
    }),
});

const logoutSchema = joi.object({
  refreshToken: joi.string().required(),
});

export const validateSignup = validateUser(signupSchema);
export const validateLogin = validateUser(loginSchema);
export const validateChangePassword = validateUser(changePasswordSchema);
export const validateLogout = validateUser(logoutSchema);
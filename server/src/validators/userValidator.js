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


export const validateSignup = validateUser(signupSchema);
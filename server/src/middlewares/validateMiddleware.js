import express from 'express';
import Joi from 'joi';

const validateUser = (schema) => (req, res, next) =>{
    const { error , value } = schema.validate(req.body, { abortEarly: false })

    if(error) {
        return res.status(400).json({
            message: "Validation error",
            errors : error.details.map((err)=> err.message)
        })
    }

    req.body = value //Sanitized and validated data is assigned back to req.body for further processing in route handlers
    next()
}

export { validateUser}
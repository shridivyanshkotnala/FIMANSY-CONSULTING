//This is the part where edge case of 404 page has to be handled properly and also the error handler which will handle all the errors in the application and send the response to the client with the error message and stack trace if in development mode.

const routenotfound = (req, res , next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    if (err.name ==="CastError" && err.kind === "ObjectId") {
        statusCode = 404;
        message = "Resource not found";
    }
    res.status(statusCode).json({
        message: message,
        stack : process.env.NODE_ENV === "production" ? null : err.stack,
    })
}


export { routenotfound, errorHandler };
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { errorHandler, routenotfound } from './src/middlewares/errorMiddleware.js'
import router from './src/routes/indexRoutes.js'
import userRoute from './src/routes/userRoutes.js'
import passport from "./src/config/passport.js";


const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}))


app.use(express.json({limit : "16kb"}));

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

app.use(cookieParser());

app.use(morgan('dev')); //Only for development mode
// app.use(morgan('combined')); //For production mode means when deploying the application

app.use("/api",router);
app.use("/auth", userRoute);
app.use(passport.initialize());


app.use(routenotfound)
app.use(errorHandler)

export default app
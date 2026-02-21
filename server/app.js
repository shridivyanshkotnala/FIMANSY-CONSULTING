import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import session from 'express-session'
import { errorHandler, routenotfound } from './src/middlewares/errorMiddleware.js'
import router from './src/routes/indexRoutes.js'
import userRoute from './src/routes/userRoutes.js'
import passport from "./src/config/passport.js";


const app = express()

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

// express-session MUST come before passport — OAuth2 strategy uses req.session
// to store the state parameter between redirect and callback (CSRF protection)
//
// app.use(session({
//     secret: process.env.SESSION_SECRET || 'fimansy_dev_secret',
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         secure: process.env.NODE_ENV === 'production',
//         httpOnly: true,
//         maxAge: 10 * 60 * 1000 // 10 min — only needed for OAuth handshake
//     }
// }));

// passport MUST be initialized after session and before any route that uses it
app.use(passport.initialize());
// app.use(passport.session());

app.use("/api",router);
app.use("/auth", userRoute);


app.use(routenotfound)
app.use(errorHandler)

export default app
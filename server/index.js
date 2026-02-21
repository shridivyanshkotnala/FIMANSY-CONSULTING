
import "./loadEnv.js"
import connectDB from './src/db/index.js'
import app from './app.js'
import { startScheduler } from "./src/services/schedulerService.js";

console.log('MONGODB_URI:', process.env.MONGODB_URI)


;(async () => {
  await connectDB()
  console.log('Database connected successfully')
  startScheduler(); // start the scheduler in the background when server starts. Scheduler will acquire locks and run jobs at their scheduled time.
  app.listen(process.env.PORT, () => {
    console.log("Loading server.... ")
    console.log(`Server running on port ${process.env.PORT}`)
  })
})()

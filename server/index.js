
import "./loadEnv.js"
import connectDB from './src/db/index.js'
import app from './app.js'
import { startScheduler } from "./src/services/schedulerService.js";

console.log('MONGODB_URI:', process.env.MONGODB_URI)

const workersEnabled = String(process.env.WORKERS_ENABLED || "false").toLowerCase() === "true";


;(async () => {
  await connectDB()
  console.log('Database connected successfully')
  if (workersEnabled) {
    startScheduler(); // start the scheduler in the background when server starts. Scheduler will acquire locks and run jobs at their scheduled time.
  } else {
    console.log("[SCHEDULER] WORKERS_ENABLED is false. All worker jobs are temporarily blocked.");
  }
  app.listen(process.env.PORT, () => {
    console.log("Loading server.... ")
    console.log(`Server running on port ${process.env.PORT}`)
  })
})()

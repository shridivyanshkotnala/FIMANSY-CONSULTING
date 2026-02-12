
import "./loadEnv.js"
import connectDB from './src/db/index.js'
import app from './app.js'


console.log('MONGODB_URI:', process.env.MONGODB_URI)


;(async () => {
  await connectDB()
  console.log('Database connected successfully')
  app.listen(process.env.PORT, () => {
    console.log("Loading server.... ")
    console.log(`Server running on port ${process.env.PORT}`)
  })
})()

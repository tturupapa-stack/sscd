import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import configRouter from './routes/config.js'
import parseRouter from './routes/parse.js'
import scheduleRouter from './routes/schedule.js'
import calendarRouter from './routes/calendar.js'
import authRouter from './routes/auth.js'

const app = express()
const PORT = process.env.PORT || 3000

// CORS 설정 - Vercel 프론트엔드 허용
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}
app.use(cors(corsOptions))
app.use(express.json())

// Routes
app.use('/api/config', configRouter)
app.use('/api/parse', parseRouter)
app.use('/api/schedule', scheduleRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/auth', authRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

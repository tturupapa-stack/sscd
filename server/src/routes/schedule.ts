import { Router } from 'express'
import { readFile } from 'fs/promises'
import { parse } from 'yaml'
import path from 'path'
import { createSchedule, calculateRequiredWeeks } from '../services/scheduler.js'
import type { Config, Project, Routine } from '../types/index.js'

const router = Router()

const CONFIG_PATH = path.resolve(process.cwd(), '../data/config.yaml')

// POST /api/schedule
router.post('/', async (req, res) => {
  try {
    const { projects, routines, startDate, weeks } = req.body as {
      projects: Project[]
      routines: Routine[]
      startDate: string
      weeks?: number
    }

    // config 읽기
    const configContent = await readFile(CONFIG_PATH, 'utf-8')
    const config = parse(configContent) as Config

    // 시작일 기본값: 오늘
    const start = startDate || new Date().toISOString().split('T')[0]
    const weekCount = weeks || config.schedule_weeks || 2

    const result = createSchedule(projects, routines, config, start, weekCount)

    res.json(result)
  } catch (error) {
    console.error('Schedule error:', error)
    res.status(500).json({ error: 'Failed to create schedule' })
  }
})

// POST /api/schedule/estimate - 필요 기간 계산
router.post('/estimate', async (req, res) => {
  try {
    const { projects, routines, startDate } = req.body as {
      projects: Project[]
      routines: Routine[]
      startDate: string
    }

    // config 읽기
    const configContent = await readFile(CONFIG_PATH, 'utf-8')
    const config = parse(configContent) as Config

    // 시작일 기본값: 오늘
    const start = startDate || new Date().toISOString().split('T')[0]

    const estimate = calculateRequiredWeeks(projects, routines, config, start)

    res.json(estimate)
  } catch (error) {
    console.error('Estimate error:', error)
    res.status(500).json({ error: 'Failed to estimate required weeks' })
  }
})

export default router

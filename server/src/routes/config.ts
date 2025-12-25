import { Router } from 'express'
import { readFile, writeFile } from 'fs/promises'
import { parse, stringify } from 'yaml'
import path from 'path'

const router = Router()

// server 디렉토리에서 실행되므로 상위의 data 폴더 참조
const CONFIG_PATH = path.resolve(process.cwd(), '../data/config.yaml')

// GET /api/config
router.get('/', async (req, res) => {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8')
    const config = parse(content)
    res.json(config)
  } catch (error) {
    console.error('Config read error:', error)
    res.status(500).json({ error: 'Failed to read config' })
  }
})

// PUT /api/config
router.put('/', async (req, res) => {
  try {
    // 기존 config 읽기
    const existingContent = await readFile(CONFIG_PATH, 'utf-8')
    const existingConfig = parse(existingContent) || {}

    // 새로운 값과 merge (부분 업데이트 지원)
    const updatedConfig = { ...existingConfig, ...req.body }

    const yaml = stringify(updatedConfig)
    await writeFile(CONFIG_PATH, yaml, 'utf-8')
    res.json({ success: true })
  } catch (error) {
    console.error('Config write error:', error)
    res.status(500).json({ error: 'Failed to save config' })
  }
})

export default router

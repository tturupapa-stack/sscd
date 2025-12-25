import { Router } from 'express'
import multer from 'multer'
import { parseProject } from '../parsers/projectParser.js'
import { parseRoutine, isRoutineFile } from '../parsers/routineParser.js'
import type { Project, Routine } from '../types/index.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// POST /api/parse
router.post('/', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[]

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' })
      return
    }

    const projects: Project[] = []
    const routines: Routine[] = []

    for (const file of files) {
      const content = file.buffer.toString('utf-8')
      const filename = file.originalname

      if (isRoutineFile(content)) {
        routines.push(parseRoutine(content, filename))
      } else {
        projects.push(parseProject(content, filename))
      }
    }

    res.json({ projects, routines })
  } catch (error) {
    console.error('Parse error:', error)
    res.status(500).json({ error: 'Failed to parse files' })
  }
})

export default router

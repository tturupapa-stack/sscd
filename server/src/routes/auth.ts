import { Router } from 'express'
import {
  getAuthUrl,
  exchangeCodeForTokens,
  isAuthenticated,
  revokeAuth,
} from '../services/googleCalendar.js'

const router = Router()

// GET /api/auth/status
router.get('/status', async (req, res) => {
  try {
    const authenticated = await isAuthenticated()
    res.json({ authenticated })
  } catch (error) {
    res.json({ authenticated: false })
  }
})

// GET /api/auth/google
router.get('/google', async (req, res) => {
  try {
    const url = getAuthUrl()
    res.redirect(url)
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ error: 'Failed to generate auth URL' })
  }
})

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' })
      return
    }

    await exchangeCodeForTokens(code)

    // 프론트엔드로 리다이렉트
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/settings?auth=success`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/settings?auth=error`)
  }
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    await revokeAuth()
    res.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Failed to logout' })
  }
})

export default router

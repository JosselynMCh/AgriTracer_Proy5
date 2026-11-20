import { Router } from 'express'
import { getGpsTracking } from '../controllers/gpsController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()
router.get('/', requireAuth, getGpsTracking)

export default router

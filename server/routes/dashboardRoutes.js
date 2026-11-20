import { Router } from 'express'
import { getDashboardData } from '../controllers/dashboardController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()
router.get('/', requireAuth, getDashboardData)

export default router

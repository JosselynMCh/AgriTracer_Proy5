import { Router } from 'express'
import { getReportesData } from '../controllers/reportesController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()
router.get('/', requireAuth, getReportesData)

export default router

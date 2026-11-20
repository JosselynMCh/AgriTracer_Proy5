import { Router } from 'express'
import {
  getPrediccion,
  savePrediccionRun,
} from '../controllers/prediccionController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()
router.get('/', requireAuth, getPrediccion)
router.post('/ejecutar', requireAuth, savePrediccionRun)

export default router

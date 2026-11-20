import { Router } from 'express'
import {
  createConvocatoria,
  listConvocatorias,
} from '../controllers/convocatoriasController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()
router.get('/', requireAuth, listConvocatorias)
router.post('/', requireAuth, createConvocatoria)

export default router

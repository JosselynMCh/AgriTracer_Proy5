import { Router } from 'express'
import {
  createTrabajador,
  getTrabajadorDetalle,
  listTrabajadores,
} from '../controllers/trabajadoresController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()
router.get('/', requireAuth, listTrabajadores)
router.get('/:id/detalle', requireAuth, getTrabajadorDetalle)
router.post('/', requireAuth, createTrabajador)

export default router

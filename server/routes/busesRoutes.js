import { Router } from 'express'
import {
  assignBusToRoute,
  createBus,
  listBusesAndAssignments,
} from '../controllers/busesController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()
router.get('/', requireAuth, listBusesAndAssignments)
router.post('/', requireAuth, createBus)
router.post('/asignar', requireAuth, assignBusToRoute)

export default router

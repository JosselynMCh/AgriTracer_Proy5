import { Router } from 'express'
import { createRuta, listRutas, updateRuta } from '../controllers/rutasController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()
router.get('/', requireAuth, listRutas)
router.post('/', requireAuth, createRuta)
router.put('/:id', requireAuth, updateRuta)

export default router

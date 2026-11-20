import { Router } from 'express'
import {
  changePassword,
  login,
  me,
  updateProfile,
  updateProfilePhoto,
} from '../controllers/authController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()

router.post('/login', login)
router.get('/me', requireAuth, me)
router.put('/profile', requireAuth, updateProfile)
router.put('/photo', requireAuth, updateProfilePhoto)
router.put('/password', requireAuth, changePassword)

export default router

const express = require('express');
const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', protect, logoutAll);
router.get('/me', protect, me);

module.exports = router;


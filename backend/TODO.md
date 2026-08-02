# Authentication System Implementation TODO

## Steps
- [x] 1. Initialize Node.js project & install Express
- [x] 2. Create basic server.js listening on port 8000
- [x] 3. Install dependencies (jsonwebtoken, bcryptjs, dotenv, uuid)
- [x] 4. Create .env with JWT secrets/config
- [x] 5. Create .gitignore
- [x] 6. Create src/config/db.js (file-based data store)
- [x] 7. Create src/models/userModel.js (user CRUD)
- [x] 8. Create src/services/tokenService.js (token generation, rotation, reuse detection)
- [x] 9. Create src/middleware/authMiddleware.js (JWT verification)
- [x] 10. Create src/middleware/errorHandler.js (centralized errors)
- [x] 11. Create src/controllers/authController.js (register/login/refresh/logout/me)
- [x] 12. Create src/routes/authRoutes.js (auth routes)
- [x] 13. Update server.js to mount routes & use error handler
- [x] 14. Test all auth flows (register, login, refresh rotation, reuse detection, logout)


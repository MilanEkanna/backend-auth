require('dotenv').config();
const app = require('./app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 8000;

// Ensure data files exist (local development only — on Vercel this is a no-op
// because the Redis store is used instead).
db.ensureDataFiles();

// Start the server (local development / production self-host)
app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});


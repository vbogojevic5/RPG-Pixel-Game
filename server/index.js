import 'dotenv/config';
import app from './server.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[rpg-server] listening on http://localhost:${PORT}`);
});

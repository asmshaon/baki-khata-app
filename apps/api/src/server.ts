import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4000);
createApp().listen(port, '0.0.0.0', () => {
  console.log(`Baki Khata API on http://0.0.0.0:${port}`);
});

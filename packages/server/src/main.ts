import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import qrcode from 'qrcode-terminal';
import { RoomManager } from './rooms.js';
import { loadDictionary } from './dictionary.js';
import { registerSockets } from './sockets.js';

const PORT = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

function lanIP(): string {
  for (const nets of Object.values(networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

const app = express();
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const httpServer = createServer(app);
const io = new Server(httpServer);

const dict = await loadDictionary();
registerSockets(io, new RoomManager(), dict);

httpServer.listen(PORT, '0.0.0.0', () => {
  const url = `http://${lanIP()}:${PORT}`;
  console.log(`\n🎉 Scrabble Party is up!\n\n   ${url}\n`);
  qrcode.generate(url, { small: true });
  console.log('Point phones at the QR code or type the URL.\n');
});

const express = require('express');
const next = require('next');
const http = require('http');
const { Server } = require('socket.io');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const QRCode = require('qrcode');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();
    const httpServer = http.createServer(server);
    const io = new Server(httpServer);

    io.on('connection', (socket) => {
        socket.on('start-session', async (data) => {
            const { type, phone } = data;
            const sessionDir = './sessions/' + socket.id;
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            const { version } = await fetchLatestBaileysVersion();

            const conn = makeWASocket({
                auth: state,
                version,
                logger: pino({ level: "fatal" }),
                browser: Browsers.macOS("Desktop"),
            });

            conn.ev.on("creds.update", saveCreds);

            conn.ev.on("connection.update", async (s) => {
                const { connection, qr, lastDisconnect } = s;

                if (qr && type === 'qr') {
                    const qrBase64 = await QRCode.toDataURL(qr);
                    socket.emit('qr', qrBase64);
                }

                if (connection === "open") {
                    const sessionID = "NEXA-MD~" + Buffer.from(JSON.stringify(conn.authState.creds)).toString('base64');
                    await conn.sendMessage(conn.user.id, { text: `*NEXA-MD SESSION CONNECTED*\n\n\`\`\`${sessionID}\`\`\`` });
                    socket.emit('connected', { sessionID });
                    
                    await delay(5000);
                    conn.end();
                    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
                }

                if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode === 405) socket.emit('error', "Connection blocked by WhatsApp. Try again.");
                }
            });

            if (type === 'pair' && phone) {
                await delay(10000); // 405 എറർ ഒഴിവാക്കാൻ 10 സെക്കൻഡ് ഗ്യാപ്പ്
                try {
                    const code = await conn.requestPairingCode(phone.replace(/[^0-9]/g, ''));
                    socket.emit('code', code);
                } catch (err) {
                    socket.emit('error', "Pairing failed. Try later.");
                }
            }
        });
    });

    server.all('*', (req, res) => handle(req, res));
    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, () => console.log(`🚀 NEXA-MD Live at http://localhost:${PORT}`));
});

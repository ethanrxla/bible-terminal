/**
 * The WhatsApp connection.
 *
 * Baileys links this process to WhatsApp as a companion device, the same way
 * WhatsApp Web does. That is what makes posting into a group possible at all:
 * Meta's official Cloud API cannot send to groups, only to individuals.
 *
 * The session lives in AUTH_DIR and is written to continuously. Losing that
 * directory means pairing the phone again by hand, which is why the deployment
 * notes insist on a real disk rather than an ephemeral container filesystem.
 */

import {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
  type WASocket,
} from 'baileys';
import type { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from './config.js';

const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL ?? 'warn' });

const RECONNECT_MIN_MS = 2_000;
const RECONNECT_MAX_MS = 5 * 60 * 1000;

export interface Connection {
  /** Resolves once the socket is open and able to send. */
  ready: () => Promise<WASocket>;
}

export function connect(onLog: (message: string) => void): Connection {
  let socket: WASocket | null = null;
  let resolveReady: ((value: WASocket) => void) | null = null;
  let readyPromise = new Promise<WASocket>((resolve) => {
    resolveReady = resolve;
  });
  let backoff = RECONNECT_MIN_MS;
  let pairingRequested = false;

  const start = async (): Promise<void> => {
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();

    socket = makeWASocket({
      version,
      auth: state,
      browser: Browsers.ubuntu('BibleTerminal'),
      // This bot only ever sends. Pulling message history would cost memory
      // and bandwidth for data it never reads.
      syncFullHistory: false,
      // Do not steal presence from the phone: marking this device online
      // makes WhatsApp route notifications here instead of to the handset.
      markOnlineOnConnect: false,
      logger,
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !state.creds.registered) {
        // A pairing code is far easier than scanning a QR over SSH, but it
        // needs the number up front; fall back to the QR when it is absent.
        if (config.phoneNumber && !pairingRequested) {
          pairingRequested = true;
          void socket
            ?.requestPairingCode(config.phoneNumber)
            .then((code) => onLog(`Pairing code: ${code}  (WhatsApp > Linked devices > Link with phone number)`))
            .catch((error: Error) => {
              onLog(`Pairing code failed (${error.message}); falling back to QR.`);
              qrcode.generate(qr, { small: true });
            });
        } else if (!config.phoneNumber) {
          onLog('Scan this QR in WhatsApp > Linked devices:');
          qrcode.generate(qr, { small: true });
        }
      }

      if (connection === 'open') {
        backoff = RECONNECT_MIN_MS;
        onLog('Connected to WhatsApp.');
        resolveReady?.(socket as WASocket);
        resolveReady = null;
      }

      if (connection === 'close') {
        const status = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;

        if (status === DisconnectReason.loggedOut) {
          // The stored credentials are dead. Retrying cannot fix this -- a
          // person has to pair the phone again -- so fail loudly instead of
          // looping forever and looking healthy.
          onLog('Logged out by WhatsApp. Delete AUTH_DIR and pair again.');
          process.exit(1);
        }

        // Anything else is a dropped connection; Baileys expects the caller
        // to build a fresh socket rather than reusing the closed one.
        if (!resolveReady) {
          readyPromise = new Promise<WASocket>((resolve) => {
            resolveReady = resolve;
          });
        }
        onLog(`Connection closed (${status ?? 'unknown'}); reconnecting in ${Math.round(backoff / 1000)}s.`);
        setTimeout(() => void start().catch((error: Error) => onLog(`Reconnect failed: ${error.message}`)), backoff);
        backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
      }
    });
  };

  void start().catch((error: Error) => onLog(`Initial connection failed: ${error.message}`));

  return { ready: () => readyPromise };
}

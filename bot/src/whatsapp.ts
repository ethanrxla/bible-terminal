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

/**
 * `onConnected` fires on every successful connection, not just the first.
 * A dropped connection is replaced by a brand new socket, and anything bound
 * to the old one -- event listeners above all -- is gone with it.
 */
export function connect(
  onLog: (message: string) => void,
  onConnected?: (socket: WASocket) => void,
): Connection {
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
        // A QR is refreshed every ~20s and can simply be re-scanned, so it is
        // the more forgiving of the two. A pairing code expires and cannot be
        // renewed without restarting, which is why PAIR_MODE can force QR.
        if (config.pairMode === 'qr' || !config.phoneNumber) {
          onLog('Scan this QR in WhatsApp > Settings > Linked devices (it refreshes automatically):');
          qrcode.generate(qr, { small: true });
          return;
        }

        if (pairingRequested) return;
        pairingRequested = true;

        // Requested a beat after the socket settles: asking immediately on
        // the first qr event is what tends to produce a code the server then
        // rejects, ending in 408 and a poisoned auth directory.
        setTimeout(() => {
          void socket
            ?.requestPairingCode(config.phoneNumber)
            .then((code) => {
              onLog('');
              onLog(`    PAIRING CODE:  ${code}`);
              onLog('');
              onLog('    On the phone: WhatsApp > Settings > Linked devices');
              onLog('                  > Link with phone number > enter the code.');
              onLog('    It expires in about a minute -- have that screen open first.');
              onLog('    If it fails: run `bible-bot-reset`, then pair again.');
              onLog('');
            })
            .catch((error: Error) => {
              onLog(`Pairing code failed (${error.message}); showing a QR instead.`);
              qrcode.generate(qr, { small: true });
            });
        }, 3000);
      }

      if (connection === 'open') {
        backoff = RECONNECT_MIN_MS;
        onLog('Connected to WhatsApp.');
        onConnected?.(socket as WASocket);
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

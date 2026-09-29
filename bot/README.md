# The WhatsApp bot

Posts the day's reading into the family group every morning at 6:10am Eastern,
as three messages: the passage, the AI interpretation, then a discussion
question.

It chooses nothing. The website picks the passage and writes the
interpretation once per day; this process reads `/api/daily` and relays it, so
the group and the site always show the same text and the model is never called
twice for it.

## Why Baileys, and what that costs you

Meta's official WhatsApp Cloud API **cannot send to group chats** — only to
individual numbers. Posting into a family group means linking as a companion
device, the way WhatsApp Web does, which is what
[Baileys](https://github.com/WhiskeySockets/Baileys) implements.

That is against WhatsApp's terms of service. For three or four messages a day
into one family group the practical risk is low, but it is not zero: the
linked number could in principle be banned. **Use a number you can afford to
lose rather than your primary one.**

Two other things worth knowing up front:

- A companion device is logged out if the primary phone does not connect to
  WhatsApp for about 14 days. Recovery needs a person holding that phone.
- Baileys tracks an unofficial protocol. Expect an occasional `npm update`
  when connections start failing for no visible reason.

## Layout

| File | |
|---|---|
| `src/index.ts` | Wiring: schedule, catch-up, the send loop |
| `src/whatsapp.ts` | Socket lifecycle, reconnect, pairing |
| `src/daily.ts` | Reads `/api/daily`, with backoff for a cold generation |
| `src/messages.ts` | Turns the payload into WhatsApp messages (pure, tested) |
| `src/state.ts` | Which day has already been sent |
| `src/groups.ts` | One-off: list group JIDs |
| `deploy/bible-bot.service` | systemd unit |

## Running it locally

```bash
cd bot
npm install
cp .env.example .env      # fill in WHATSAPP_GROUP_JID and WHATSAPP_NUMBER
npm test                  # message shaping, no network or phone needed
```

See what the morning message would say, without sending anything or needing a
paired phone:

```bash
DRY_RUN=1 npm run dev
```

## Pairing

Pairing is interactive and has to happen **before** the service is enabled.

```bash
npm run build
node dist/index.js
```

With `WHATSAPP_NUMBER` set, it prints an eight-character code. On the phone:
**WhatsApp → Settings → Linked devices → Link with phone number**, and enter
it. (Without that variable it prints a QR code instead, which is harder to
scan over SSH.) Confirm `creds.json` appears in `AUTH_DIR`, then Ctrl-C.

## Finding the group JID

Once paired:

```bash
npm run groups
```

It prints every group the account is in, with its JID, and exits. Copy the id
of the family group into `WHATSAPP_GROUP_JID`.

This step is deliberately manual. Matching on the group's *name* is tempting
and is a trap — two groups end up with similar names, someone renames one, and
scripture lands in the wrong chat.

## Deploying to a DigitalOcean droplet

**Not App Platform.** `useMultiFileAuthState` writes session keys
continuously, and App Platform's filesystem is ephemeral: every deploy or
restart would wipe the session, and a lost session cannot be re-established
unattended — it needs a person with the phone. You would be re-pairing after
every push. A droplet with a real disk avoids this entirely.

The $4/month 512MB droplet is enough (Baileys idles around 120–200MB); add a
swapfile as insurance.

```bash
# as root on a fresh Ubuntu 24.04 droplet
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git

fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

adduser --system --group biblebot
mkdir -p /var/lib/bible-bot/{auth,data}
chown -R biblebot:biblebot /var/lib/bible-bot
chmod 700 /var/lib/bible-bot/auth /var/lib/bible-bot/data

git clone https://github.com/ethanrxla/bible-terminal /opt/bible-terminal
cd /opt/bible-terminal/bot && npm ci && npm run build

install -m 600 /dev/null /etc/bible-bot.env   # then fill it in from .env.example
cp deploy/bible-bot.service /etc/systemd/system/

# Pair first -- interactive, cannot happen under systemd:
sudo -u biblebot --preserve-env=HOME env $(grep -v '^#' /etc/bible-bot.env | xargs) node dist/index.js
# ...enter the pairing code on the phone, wait for "Connected", then Ctrl-C.

systemctl daemon-reload && systemctl enable --now bible-bot
journalctl -u bible-bot -f
```

No inbound ports are needed — the bot only makes outbound connections, so
there is nothing to expose and no firewall rule to add.

### Back up the session

Losing `AUTH_DIR` means pairing by hand again.

```bash
tar czf /root/bible-bot-auth-$(date +%F).tar.gz -C /var/lib/bible-bot auth
```

Worth a weekly cron, copied somewhere off the droplet.

## Operating it

| | |
|---|---|
| Logs | `journalctl -u bible-bot -f` |
| Send today by hand | `systemctl stop bible-bot`, remove `data/sent.json`, start it inside the catch-up window |
| Skip today | leave `sent.json` pointing at today's date |
| Re-pair | `systemctl stop bible-bot`, delete `AUTH_DIR`, pair again, start |

The bot writes `data/sent.json` only after every message has landed, so a
restart cannot re-send a day that completed. A crash *midway* through the
three messages does re-send the whole day on the next run — a rare duplicate
is easier to live with than an interpretation that never arrived.

`RestartPreventExitStatus=1` in the unit is deliberate: a logged-out session
exits 1, and restarting on a loop would make the unit look healthy while doing
nothing at all.

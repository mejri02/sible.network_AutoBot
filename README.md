# ⛏️ Sible Mining Runner (auto-OTP)

A bot that mines on [Sible](https://mine.sible.network/me124) for you, on **many accounts at once**.

**What it does, in plain words:**

1. Logs in to each of your Sible accounts
2. Reads the login code (OTP) from your Gmail **by itself**
3. Starts mining, watches the ads, and claims your rewards
4. Repeats every hour, so you don't have to

You only need to fill in one file (`accounts.json`) and run one command.

👉 **New to Sible?** [Sign up here with my referral link](https://mine.sible.network/me124)

---

## 💡 Why auto-OTP? (the best solution)

Sible login tokens **expire every ~30 minutes**. Each time that happens, Sible asks for a new OTP code by email.

Typing a new code into the bot every 30 minutes, on every account, is not realistic. So the bot does it for you:

- When a token expires, the bot logs in again by itself
- It reads the new OTP from your Gmail (using the App Password)
- It keeps mining, 24/7, with **zero manual work**

This is why the Gmail App Password is required. Set it up once and forget about it.

> 🔒 **Use a new Gmail account, not your main one.**
> Create a fresh Gmail just for Sible (and use it as your [Sible](https://mine.sible.network/me124) login email). The App Password gives the bot access to that inbox, so keep your personal Gmail out of it.

---

## 🚀 Quick Start

**0. Create your Sible account(s)** → [mine.sible.network/me124](https://mine.sible.network/me124)

**1. Install Node.js 18 or newer** → https://nodejs.org

**2. Download the bot and install it**

```bash
git clone https://github.com/mejri02/sible-bot.git
cd sible-bot
npm install
```

**3. Create your files**

```bash
cp accounts.example.json accounts.json
cp config.example.json config.json
```

**4. Fill in `accounts.json`** (see the App Password guide below 👇)

```json
{
  "_readme": "gmailAppPassword = 16-char App Password from https://myaccount.google.com/apppasswords — NOT your Gmail login password. Requires 2-Step Verification ON and IMAP enabled in Gmail settings.",
  "accounts": [
    {
      "label": "acc1",
      "email": "your-sible-email@gmail.com",
      "password": "your-sible-password",
      "gmailAppPassword": "xxxx xxxx xxxx xxxx"
    }
  ]
}
```

Want more accounts? Add more `{ ... }` blocks inside `"accounts"`, separated by commas.

| Field | What to put |
|---|---|
| `label` | Any nickname you want (`acc1`, `main`, ...) |
| `email` | Your Sible login email. It must be the **Gmail** that receives the OTP |
| `password` | Your Sible password |
| `gmailAppPassword` | The 16-character App Password (guide below) |
| `gmailAddress` | *Optional.* Only add it if the OTP goes to a different Gmail than `email` |

**5. Run it**

```bash
node index.js
```

Choose `1` for direct mode or `2` to use proxies. That's it ✅

---

## 📝 How to Get Your Gmail App Password

> **This is NOT your normal Gmail password.**
> It is a special 16-character code that lets the bot read your OTP emails.
> Follow these steps exactly.

### Step 0: Use a new Gmail account

Create a **new Gmail just for Sible** and [sign up on Sible](https://mine.sible.network/me124) with it. Don't use your main Gmail. Also make sure **IMAP is enabled** in Gmail: Settings → See all settings → Forwarding and POP/IMAP → Enable IMAP.

### Step 1: Turn on 2-Step Verification

1. Go to your Google Account: [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the menu.
3. Find **2-Step Verification** and turn it **ON**.

> ℹ️ Google will **not** show the App Passwords option unless this is turned on first.

### Step 2: Create the App Password

1. Open this link directly: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   (or search for **App passwords** in the Security page)
2. Type a name for the app, for example `Sible Bot`, and click **Create**.

### Step 3: Copy the Code

Google shows you a 16-character password like this:

![Generated app password example](screenshots/app-password.jpg)

1. **Copy it immediately.** You will not be able to see it again.
2. Paste it into the `gmailAppPassword` field in your `accounts.json`.

Example: `"gmailAppPassword": "abcd efgh ijkl mnop"`

### ⚠️ Important Warnings

- **Do not use your real Gmail password.** The bot will fail with an `Invalid credentials` error.
- **Spaces are okay.** The code is shown as `xxxx xxxx xxxx xxxx`, but you can paste it with or without spaces.
- **If you change your main Google password**, Google revokes the App Password. Create a new one and update `accounts.json`.
- **Use a dedicated Gmail, not your personal one.** The App Password gives access to that inbox.
- **Never share it or upload it to GitHub.** It gives access to your Gmail. Keep `accounts.json` private (it is already in `.gitignore`).

---

## ⚙️ Options

### Command-line flags

| Flag | What it does |
|---|---|
| `--once` | Run one cycle and stop |
| `--loop` | Keep running forever (default) |
| `--interval=3600` | Max seconds to sleep between cycles |
| `--only=acc1` | Run only this account |
| `--exclude=acc2` | Skip this account |
| `--quiet` | Less output |
| `--file=`, `--accounts=`, `--config=`, `--proxy=` | Use different file names |

### `config.json` (optional)

```json
{
  "referralCode": "",
  "interval": 3600,
  "discordWebhook": "",
  "logCsv": true,
  "csvFile": "mining-log.csv"
}
```

### Proxies (optional)

Put one proxy per line in `proxy.txt`. Any of these formats work:

```
ip:port
ip:port:user:pass
http://user:pass@ip:port
socks5://ip:port
```

Dead proxies are removed automatically when the bot starts.

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---|---|
| `gmailAppPassword must be exactly 16 characters` | You pasted the wrong thing. Use the App Password, not your Gmail password. |
| `Invalid credentials` (Gmail) | Wrong App Password, or 2-Step Verification is off. Create a new one. |
| `OTP email timeout` | Check that `gmailAddress` is the inbox that gets the Sible email. Check that IMAP is enabled in Gmail settings. |
| `HTTP 429` | Too many requests. The bot waits by itself. Try fewer accounts or use proxies. |
| Refresh token dead | The bot logs in again automatically with a new OTP. |

---

## 📁 Files

| File | Purpose |
|---|---|
| `accounts.json` | Your accounts (**keep private**) |
| `accounts-auth.json` | Saved login tokens, created by the bot (**keep private**) |
| `config.json` | Optional settings |
| `proxy.txt` | Optional proxies |
| `mining-log.csv` | Log of every cycle |

---

## ❤️ Support

If this bot helps you, sign up to Sible with my link: **[https://mine.sible.network/me124](https://mine.sible.network/me124)**

---

## ⚠️ Disclaimer

Use at your own risk. Automating accounts may go against the platform's rules, and accounts can be limited or banned. Never share your passwords, App Passwords, or token files.

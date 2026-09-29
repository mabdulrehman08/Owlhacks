# Deploying to readtheroom.cooking (Vultr + Porkbun)

One Vultr server runs the whole stack with Docker Compose. Caddy sits in front and
handles HTTPS automatically. Porkbun only does DNS.

```
browser ──HTTPS──> Caddy :443 ──> frontend :3000 ──/api──> backend :8000
                   (Vultr server, docker compose; only 80/443 are public)
```

## 1. Create the server (Vultr)

- **Products → Deploy → Cloud Compute (Shared CPU)**
- Image: **Ubuntu 24.04 LTS x64**
- Plan: **2 GB RAM** or more (the frontend build needs it; 1 GB runs out of memory)
- Add your SSH key, then deploy. Note the server's **public IPv4**.

## 2. Point the domain at it (Porkbun → Domain Management → DNS)

Delete Porkbun's default parking records:

| Type | Host | Answer |
|---|---|---|
| A | `readtheroom.cooking` | 192.0.79.145 |
| A | `readtheroom.cooking` | 192.0.79.161 |
| A | `*.readtheroom.cooking` | 192.0.79.145 |
| A | `*.readtheroom.cooking` | 192.0.79.161 |

Add:

| Type | Host | Answer | TTL |
|---|---|---|---|
| A | *(blank)* | `<VULTR_IP>` | 600 |
| A | `www` | `<VULTR_IP>` | 600 |

The `_acme-challenge` TXT records can stay; Caddy doesn't use them.

Check it resolves before step 4: `dig +short readtheroom.cooking` should print the Vultr IP.

## 3. Install Docker on the server

```bash
ssh root@<VULTR_IP>
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
```

## 4. Get the code and start it

```bash
git clone https://github.com/mabdulrehman08/Owlhacks.git && cd Owlhacks
cp backend/.env.example backend/.env && nano backend/.env   # GEMINI_API_KEY (or ANTHROPIC_API_KEY) + SMARTSPECTRA_API_KEY
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Open **https://readtheroom.cooking**. The first request can take ~30s while Caddy
gets the certificate. If it fails, check `docker compose logs caddy`: the usual
cause is DNS not pointing at the server yet.

## Updating after new commits

```bash
cd Owlhacks && git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Reactions (`backend-data`), uploaded videos (`videos`) and certificates
(`caddy-data`) are Docker volumes, so they survive rebuilds. `down -v` deletes them.

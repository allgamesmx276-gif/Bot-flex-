# Bot-flex-
Bot proporcionado por flexgsm

## Despliegue 24/7 en la nube (VPS Ubuntu)

### 1) Preparar servidor
1. Crear VPS Ubuntu 22.04 (2 GB RAM minimo, recomendado 4 GB).
2. Entrar por SSH.
3. Ejecutar setup inicial:

```bash
chmod +x scripts/server-setup-ubuntu.sh
./scripts/server-setup-ubuntu.sh
```

### 2) Clonar e instalar

```bash
git clone https://github.com/allgamesmx276-gif/Bot-flex-.git
cd Bot-flex-
npm ci
```

### 3) Primer inicio (vincular WhatsApp)

```bash
node index.js
```

Escanea el QR una sola vez y deten con `Ctrl + C`.

### 4) Dejar corriendo con PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5) Comandos utiles

```bash
pm2 status
pm2 logs flexbot
pm2 restart flexbot --update-env
```

## Notas importantes

1. No borres `.wwebjs_auth/` en el VPS para no perder sesion.
2. `data.json` no se sube al repo (privado por seguridad).
3. Si cambias de cuenta de WhatsApp, respalda y limpia `.wwebjs_auth/` y `.wwebjs_cache/`.

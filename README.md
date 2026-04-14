
# Bot-flex-

## Instalación

### Requisitos generales
- Node.js 18+ y npm
- git

### Instalación en Termux (Android)
```bash
pkg update && pkg install git nodejs
git clone https://github.com/allgamesmx276-gif/Bot-flex-.git
cd Bot-flex-
npm install
npm start
# Si quieres mantenerlo activo en segundo plano:
npm install -g pm2
pm2 start index.js --name flexbot
```

### Instalación en PowerShell (Windows)
1. Instala Node.js desde https://nodejs.org/
2. Instala git desde https://git-scm.com/
3. Abre PowerShell y ejecuta:
```powershell
git clone https://github.com/allgamesmx276-gif/Bot-flex-.git
cd Bot-flex-
npm install
npm start
# O usa pm2 si lo tienes instalado:
pm2 start index.js --name flexbot
```

### Primer inicio
- Al iniciar por primera vez, el bot puede pedir escanear un código QR en WhatsApp.
- Sigue las instrucciones en consola.

### Notas
- Para producción se recomienda usar pm2.
- Configura correctamente los archivos de datos y permisos según tu entorno.

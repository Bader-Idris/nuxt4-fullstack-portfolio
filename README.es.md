# Aplicación de Portafolio Full-Stack

<div align="left">

**Idioma:**
<a href="./README.md">
<img src="https://flagcdn.com/16x12/us.png" alt="English" width="16" height="12">
English
</a> |
<a href="./README.ar.md">
<img src="https://flagcdn.com/16x12/sa.png" alt="العربية" width="16" height="12">
العربية
</a> |
<a href="./README.es.md">
<img src="https://flagcdn.com/16x12/es.png" alt="Español" width="16" height="12">
Español
</a>

</div>

[![project img](https://raw.githubusercontent.com/Bader-Idris/nuxt4-fullstack-portfolio/d23114be7d8cdaf54c3a16baf012ae958734119b/public/thumbnail-es.webp)](https://baderidris.com)

Una aplicación completa de portafolio full-stack construida con Nuxt 4, que incluye características de comunicación en tiempo real, autenticación y soporte multiplataforma. Para obtener información más detallada, consulte la [documentación de Nuxt](https://nuxt.com/docs/getting-started/introduction).

## Tabla de Contenidos

- [Requisitos previos](#requisitos-previos)
- [Comenzando](#comenzando)
- [Desarrollo](#desarrollo)
- [Configuración del entorno](#configuración-del-entorno)
- [Configuración de Docker](#configuración-de-docker)
- [Construcción para producción](#construcción-para-producción)
- [Aplicación móvil](#aplicación-móvil)
- [Aplicación Electron](#aplicación-electron)
- [Despliegue en producción](#despliegue-en-producción)
- [Servidor de correo](#servidor-de-correo)
- [Seguridad](#seguridad)
- [Solución de problemas](#solución-de-problemas)

## Requisitos previos

Antes de comenzar con este proyecto, asegúrese de tener las siguientes herramientas instaladas en su sistema:

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- [Bun](https://bun.sh/) entorno de ejecución de JavaScript
- Sistema de control de versiones Git

### Instalando los requisitos previos

**Instalación de Docker:**

```bash
# Descargar y ejecutar el script oficial de instalación de Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Agregar usuario actual al grupo docker (solo Linux)
sudo usermod -aG docker $USER
```

> [!IMPORTANT]
> Después de instalar Docker, se recomienda seguir los [pasos posteriores a la instalación de Docker](https://docs.docker.com/engine/install/linux-postinstall/) para mejorar la seguridad y el rendimiento, incluyendo la ejecución de Docker como usuario no root y configurar opciones adicionales de seguridad.

**Instalación de Bun:**

```bash
# Usando el instalador oficial de Bun
curl -fsSL https://bun.sh/install | bash

# O usando npm
npm install -g bun
```

**Instalación de Git:**

```bash
# Para Ubuntu/Debian
sudo apt install git
# Para macOS
xcode-select --install
# Para Windows, descargar desde https://git-scm.com/
```

> [!IMPORTANT]
> Después de ejecutar `usermod -aG docker $USER`, debe cerrar sesión y volver a iniciarla o reiniciar para aplicar los cambios del grupo de Docker. Para configuraciones posteriores a la instalación adicionales, consulte los [pasos posteriores a la instalación de Docker](https://docs.docker.com/engine/install/linux-postinstall/).

## Comenzando

### Clonando el repositorio

```bash
git clone https://github.com/Bader-Idris/nuxt4-fullstack-portfolio.git ./portfolio

# Se recomienda renombrar el directorio del proyecto a 'portfolio' si no usó el comando anterior
sudo mv nuxt4-fullstack-portfolio portfolio
cd portfolio
```

### Instalando dependencias

> [!IMPORTANT]
> Asegúrese de tener Bun instalado antes de ejecutar estos comandos.

> [!TIP]
> Si Bun falla al compilar las aplicaciones cliente (especialmente en Windows), se recomienda encarecidamente instalar y usar **pnpm**, ya que es más estable y ha sido probado exhaustivamente para estas plataformas.

```bash
bun install
```

### Migraciones de la base de datos

> [!IMPORTANT]
> **¡La migración de la base de datos es crítica para la primera compilación!** Está intencionadamente separada del proceso principal de compilación para darle control.

Antes de ejecutar la aplicación, asegúrese de que su esquema de base de datos esté actualizado ejecutando las migraciones de Prisma:

```bash
bunx prisma migrate deploy
bunx prisma generate
```

## Desarrollo

### Iniciando el servidor de desarrollo

Para iniciar el servidor de desarrollo, vaya a `http://localhost:3000`:

```bash
bun run dev
```

> [!TIP]
> Para la experiencia completa de desarrollo con todos los servicios backend, utilice la configuración de Docker como se describe a continuación.

## Configuración del entorno

### Variables de entorno principales

Cree su configuración de entorno desde el archivo de ejemplo:

```bash
cp .env.example .env
```

> [!CAUTION]
> Modifique los valores en el archivo `.env` para reflejar su configuración específica.

> [!CAUTION]
> Si está utilizando Windows, asegúrese de instalar Git y usar Git Bash para una mejor experiencia de desarrollo.

### Archivos de configuración de entorno específicos de la plataforma

El proyecto incluye configuración de entorno para diferentes plataformas:

- `.env.example` - Variables de entorno de la aplicación principal
- `.env.electron.example` - Variables de entorno de la aplicación Electron
- `.env.capacitor.example` - Variables de entorno de la aplicación móvil

### Comandos de MongoDB CLI v8

```sh
# para acceder a la cli:
docker exec -it mongo mongosh "mongodb://<Mongo_user>:<Mongo_password>@localhost:27017/portfolio?authSource=admin"
```

```js
show dbs
// su MONGO_DB_NAME
use MONGO_DB_NAME
show collections
// por ejemplo, la colección de usuarios
db.getCollection("users").find()
// para buscar en colecciones:
db.users.find({ field: "value" }) // por ejemplo
db.users.find({ "email": "contact@baderidris.com" })

// para modificar el rol basado en el correo electrónico:
db.users.updateOne(
  { "email": "contact@baderidris.com" },
  { $set: { "role": "admin" } }
)
// para eliminar:
db.users.deleteOne({ "email": "contact@baderidris.com" })
```

### Comando de migración de MongoDB 4.4.29 a 8.2.5

```sh
# después de haber realizado el comando de respaldo con:
docker exec mongo sh -c 'mongodump --archive --gzip -u <Mongo_user> -p <Mongo_password> --authenticationDatabase admin' > /path/to/your/backup-4.4.gz
# ¡algunos datos se perderán, he visto que los chats se perdieron! ¡pero no los mensajes de administración!

# Luego ejecute este comando para restaurar los datos: (el mejor enfoque es hacer versionado secuencial como 4 -> 5 -> 6, etc.)

docker exec -i mongo mongorestore \
  --archive --gzip \
  -u <Mongo_user> \
  -p <Mongo_password> \
  --authenticationDatabase admin \
  < /path/to/your/backup-4.4.gz

# y haga esto para compatibilidad
docker exec -it mongo mongosh -u <Mongo_user> -p <Mongo_password>  --authenticationDatabase admin --eval '
  db.adminCommand({ setFeatureCompatibilityVersion: "8.2", confirm: true });
  db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 });
'

```

### Comando de migración de PostgreSQL 16 a 18

```sh
# 1. Crear una copia de seguridad de sus datos
docker exec psql pg_dump -U postgres articles > articles_backup.sql

# 2. Preservar los datos antiguos (Opcional pero recomendado)
docker volume create portfolio_psql-data-v16
docker run --rm -v portfolio_psql-data:/from -v portfolio_psql-data-v16:/to alpine ash -c "cd /from ; cp -av . /to"

# 3. Actualice su archivo Docker Compose
# Cambie la imagen a postgres:18-alpine
# Cambie el punto de montaje de /var/lib/postgresql/data a /var/lib/postgresql

# 4. Inicie el nuevo contenedor y restaure los datos
cat articles_backup.sql | docker exec -i psql psql -U postgres -d articles
```

### Respaldos Automáticos (Configuración Robusta)

El proyecto ahora incluye un servicio de respaldo dedicado que utiliza `nfrastack/container-db-backup` que respalda automáticamente tanto PostgreSQL como MongoDB cada 24 horas.

*   **Rotación**: Mantiene 7 días de respaldos de forma predeterminada (configurable a través de `DEFAULT_CLEANUP_TIME`).
*   **Almacenamiento**: Los respaldos se almacenan en el volumen `backup-data`.
*   **Soporte S3**: Para habilitar respaldos remotos, desactive los comentarios y complete las variables de entorno S3 en `compose.prod.test.yaml` o `compose.ssl.yaml`.

Para ver el estado del respaldo:
```sh
docker logs db-backup
```

Para listar los respaldos:
```sh
docker exec db-backup ls -lh /backup
```

## Configuración de Docker

### Entorno de desarrollo

El proyecto utiliza Docker Compose para un entorno de desarrollo completo que incluye todos los servicios backend necesarios.

1. **Configurar variables de entorno**

   ```bash
   cp .env.example .env
   # Edite .env con su configuración
   ```

2. **Iniciar servicios de Docker**

   ```bash
   docker compose -f b.dev.yml up -d --build
   ```

3. **Acceder a la aplicación**
   - Interfaz frontal: `http://localhost:3000`
   - Los servicios backend se configurarán automáticamente

> [!WARNING]
> La aplicación utiliza servicios backend intensivos y funciona mejor con Docker para una experiencia consistente.

### Entorno de producción

> [!IMPORTANT]
> Asegúrese de que Docker esté instalado en su máquina de producción.

Para implementar en producción con certificados SSL:

```bash
docker compose -f ./a.prod-certbot.yml up -d --build
```

> [!IMPORTANT]
> **CRÍTICO**: El directorio del proyecto DEBE llamarse `portfolio` para la implementación en producción. La configuración de Nginx está codificada para buscar contenedores en el directorio `portfolio`. Si clonó el repositorio con un nombre diferente, debe cambiar el nombre del directorio a `portfolio` o actualizar los archivos de configuración de Nginx en consecuencia.

## Construcción para producción

### Compilación estándar

Para compilar la aplicación para producción:

```bash
# add the spanish tip
cp ./compose.prod.test.yaml.example ./compose.prod.test.yaml
# add the spanish tip
docker compose -f b.dev.yml down; docker compose -f compose.prod.test.yaml up -d redis postgres mongo ; docker compose -f compose.prod.test.yaml build --progress=plain
```

> [!CAUTION]
> Compilar la aplicación en un servidor con recursos limitados se considera una mala práctica. Para un rendimiento y confiabilidad óptimos, recomendamos encarecidamente utilizar la imagen Docker precompilada disponible en [Docker Hub](https://hub.docker.com/r/baderidris/nuxt-portfolio) en lugar de compilar desde la fuente en su servidor. Si debe compilar en un servidor débil, siga las instrucciones en el archivo [weak_servers.md](./weak_servers.md) para garantizar un proceso de compilación exitoso.

Para previsualizar localmente la compilación de producción:

```bash
bun run preview
```

### Imagen Docker de producción

> [!TIP]
> Una imagen Docker precompilada está disponible en [Docker Hub](https://hub.docker.com/repository/docker/baderidris/nuxt-portfolio/general). Puede encontrar instrucciones sobre cómo descargar la imagen y ejecutarla con Docker Compose en la documentación del repositorio.

## Aplicación móvil

### Configuración

Para agregar soporte para Android e iOS:

```bash
bunx cap add android ios
```

Cree el archivo de entorno móvil:

```bash
cp .env.capacitor.example .env.capacitor
# Configure las variables de entorno
```

### Personalización de iconos de la aplicación

Para personalizar los iconos de su aplicación, modifique los iconos en la carpeta `/assets` según desee, luego ejecute:

```bash
bunx capacitor-assets generate --assetPath "./assets" --ios --android
```

> Puede revisar los requisitos de configuración en el archivo `assets/requirements.md`.

### Notificaciones push de Firebase

> [!WARNING]
> Requerido para evitar que la aplicación se bloquee con notificaciones push.

Para que funcione correctamente y evite que la aplicación móvil se bloquee, debe tener el archivo `android/app/google-services.json`. Consulte la [documentación de Capacitor](https://capacitorjs.com/docs/apis/push-notifications) y la [documentación de Firebase](https://firebase.google.com/docs/android/setup#add-config-file).

### Configuración de desarrollo para Android

Para compilar la aplicación Android, asegúrese de tener instalado [Android Studio](https://developer.android.com/studio/install) y configure estas variables de entorno:

- `ANDROID_HOME`
- `CAPACITOR_ANDROID_STUDIO_PATH`

> [!CAUTION]
> Reinicie su sesión de shell después de agregar las variables de entorno.

### Corrección de compatibilidad con Android 15+

> [!CAUTION]
> Para compatibilidad con Android 15+, después de crear el proyecto Android, necesita agregar la siguiente línea a cada sección de estilo con `Theme.AppCompat.*` en el archivo `android/app/src/main/res/values/styles.xml` para corregir el error de overlay=true en Capacitor:

```xml
<item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
```

Esto garantiza un comportamiento de visualización adecuado en dispositivos Android 15+ cuando se usa Capacitor con configuraciones `overlay=true`.

Puede consultar el problema [aquí](https://github.com/ionic-team/capacitor-plugins/issues/2350#issuecomment-2904401405)
- [Aplicación Electron](#aplicación-electron)
- [Aplicación Electrobun](#aplicación-electrobun)
- [Despliegue en producción](#despliegue-en-producción)
...
### Configuración

Para crear una compilación de producción para Electron:

1. Cree el archivo de entorno de Electron:

   ```bash
   cp .env.electron.example .env.electron
   # Configure las variables de entorno
   ```

2. Use los siguientes comandos para compilar la aplicación Electron:
   - `bun run build:electron`: Compilar para la plataforma actual
   - `bun run build:electron:all`: Compilar para Windows, macOS y Linux
   - `bun run build:electron:win`: Compilar solo para Windows
   - `bun run build:electron:mac`: Compilar solo para macOS
   - `bun run build:electron:linux`: Compilar solo para Linux
   - `bun run build:electron:dir`: Compilar en un directorio sin empaquetar para pruebas

### Instalación en Linux

Para las distribuciones de Linux, se admiten los siguientes formatos:

- **DEB**: El mejor para Ubuntu/Debian. Instalación fluida a través de la GUI o la terminal usando `sudo dpkg -i <archivo>.deb`.
- **AppImage**: Portátil y funciona en la mayoría de las distribuciones. Asegúrese de que tenga permisos de ejecución:
  ```bash
  chmod +x portfolio.AppImage
  ./portfolio.AppImage
  ```
- **Snap**: Estrictamente confinado y seguro. Dado que las compilaciones locales no están firmadas, debe realizar la instalación a través de la terminal:
  ```bash
  sudo snap install --dangerous nuxt4-fullstack-portfolio_3.4.0_linux_amd64.snap
  ```

## Aplicación Electrobun

Una alternativa moderna y ligera a Electron que utiliza Bun y vistas web del sistema.

### Configuración

1. Use el archivo de entorno de Electron existente o cree uno específico si es necesario.

2. Use los siguientes comandos para compilar o desarrollar con Electrobun:
   - `bun run dev:electrobun`: Ejecutar en modo de desarrollo con HMR y ventana nativa.
   - `bun run build:electrobun`: Compilar para la plataforma actual.
   - `bun run build:electrobun:all`: Compilar para Windows, macOS y Linux secuencialmente.
   - `bun run build:electrobun:win`: Compilar solo para Windows.
   - `bun run build:electrobun:mac`: Compilar solo para macOS.
   - `bun run build:electrobun:linux`: Compilar solo para Linux.

Los lanzamientos se organizarán y fecharán en `./release/electrobun/${version}_${timestamp}/`.

### Configuración de dominio

Asegúrese de actualizar el nombre de dominio `baderidris.com` en el archivo `b.dev.yml` y en los archivos de configuración asociados con su propio nombre de dominio.

## Aplicación Electrobun

Una alternativa moderna y ligera a Electron que utiliza Bun y vistas web del sistema.

### Configuración

1. Use el archivo de entorno de Electron existente o cree uno específico si es necesario.

2. Use los siguientes comandos para compilar o desarrollar con Electrobun:
   - `bun run dev:electrobun`: Ejecutar en modo de desarrollo con HMR y ventana nativa.
   - `bun run build:electrobun`: Compilar para la plataforma actual.
   - `bun run build:electrobun:all`: Compilar para Windows, macOS y Linux secuencialmente.
   - `bun run build:electrobun:win`: Compilar solo para Windows.
   - `bun run build:electrobun:mac`: Compilar solo para macOS.
   - `bun run build:electrobun:linux`: Compilar solo para Linux.

Los lanzamientos se organizarán y fecharán en `./release/electrobun/${version}_${timestamp}/`.

## Despliegue en producción

### Gestión de certificados SSL

> [!IMPORTANT]
> **`compose.ssl.yaml` es la plantilla SSL segura para producción.**
> Es un clon filtrado de `b.comp.prod.yaml` donde cada secreto hardcodeado ha sido reemplazado por una referencia a variable de entorno. **Nunca lo ejecute sin antes rellenar su archivo de entorno.**

Antes de comenzar, copie el archivo de entorno de ejemplo y complete sus secretos:

```bash
cp .env.ssl.example .env.production
# luego edite .env.production y establezca todos los valores requeridos
```

| Variable | Descripción |
|---|---|
| `DOMAIN` | Su dominio raíz (ej. `baderidris.com`) |
| `MAIL_HOSTNAME` | FQDN del servidor de correo (ej. `mail.baderidris.com`) |
| `CERTBOT_EMAIL` | Correo usado para notificaciones de Let's Encrypt |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` | Credenciales raíz de MongoDB |
| `REDIS_PASSWORD` | Contraseña de autenticación de Redis |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales de PostgreSQL |
| `SESSION_SECRET` / `JWT_SECRET` | Secretos de sesión y firma JWT |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales OAuth de Google |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Credenciales OAuth de Facebook |
| `SENDGRID_API_KEY` | Clave API de SendGrid para correos transaccionales |
| `MAIL_USER` / `MAIL_PASS` | Credenciales de cuenta de correo SMTP |

Luego inicie con:

```bash
docker compose -f compose.ssl.yaml --env-file .env.production up -d
```

> [!TIP]
> Para una comprensión integral de nuestro enfoque de respaldo "Robusten", recuperación ante desastres e integración de S3, consulte el [**Plan Maestro de Respaldo Robusten**](./docs/BACKUPS.md).

#### Configuración de renovación de certificados

Para automatizar las renovaciones de certificados, cree un trabajo cron modificando las rutas en el archivo `/server/config/nginx/ssl_renew.sh`, luego agregue esto a su crontab:

```bash
# Para editar su crontab, ejecute:
crontab -e

# Agregue la siguiente línea para programar el script de renovación:
0 12 * * * /home/bader/portfolio/server/config/nginx/ssl_renew.sh >> /var/log/cron.log 2>&1
```

> [!TIP]
> Revise el archivo `ssl_renew.sh` para obtener consejos y configuraciones útiles adicionales.

#### Configuración de certificado posterior al despliegue

Después del despliegue inicial, necesitará forzar a Certbot a renovar los certificados para eliminar la bandera `--staging`. Se recomienda crear un archivo compose separado para este propósito y para futuras renovaciones.

## Servidor de correo

El proyecto incluye una configuración completa de servidor de correo que se ejecuta en `mail.baderidris.com`. Está construido utilizando Docker Mailserver y es compatible con DKIM, SPF, DMARC y MTA-STS.

Para obtener instrucciones detalladas sobre cómo configurar y administrar el servidor de correo, incluidos los registros DNS y la gestión de usuarios, consulte el [script de configuración del servidor de correo](./server/config/mailserver/whatToDoOnMailserver.sh) y la [documentación detallada](./docs/README.md).

## Seguridad

Para mejorar la seguridad de su aplicación y prevenir ataques comunes como DDoS, se ha implementado Fail2Ban.

### Configuración de Fail2Ban

Los siguientes archivos están incluidos en la configuración de seguridad:

```bash
ls server/config/fail2ban/
# Contiene:
# - directorio filter.d
# - archivo my_custom_jail.local
```

### Cárceles y filtros personalizados

Se han creado cárceles y filtros personalizados para permitir a los usuarios agregar sus configuraciones después de instalar la herramienta. Esta flexibilidad le ayuda a personalizar la configuración de seguridad según sus necesidades específicas.

## Solución de problemas

### Problemas comunes

- **Estabilidad de pnpm**: Consulte la [Guía de estabilidad de pnpm](./docs/PNPM_STABILITY_GUIDE.md) para obtener instrucciones sobre cómo bloquear las versiones de las dependencias y corregir los fallos de construcción de Docker.
- **Compilaciones en servidores débiles**: Consulte [weak_servers.md](./weak_servers.md) para obtener orientación sobre la optimización de compilaciones para recursos limitados
- **Problemas con Docker**: Asegúrese de que Docker y Docker Compose estén instalados y funcionando correctamente
- **Variables de entorno**: Asegúrese de que todas las variables de entorno requeridas estén configuradas correctamente

## Comunidad

¡Únase a nuestras discusiones comunitarias! Siéntase libre de comunicarse con el mantenedor y otros miembros de la comunidad en [Discusiones de GitHub](https://github.com/Bader-Idris/nuxt4-fullstack-portfolio/discussions).

---

¡Gracias por usar la Aplicación de Portafolio Full-Stack! Si tiene alguna pregunta o necesita más ayuda, no dude en contactarnos.
# تطبيق الطقم المكمل متعدد الطبقات

<div align="left">

**اللغة:**
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

[![project img](https://raw.githubusercontent.com/Bader-Idris/nuxt4-fullstack-portfolio/d23114be7d8cdaf54c3a16baf012ae958734119b/public/thumbnail-ar.webp)](https://baderidris.com)

تطبيق شامل متعدد الطبقات والميزات مبني باستخدام Nuxt 4، يحتوي على ميزات الاتصال الفوري (websocket)، التحقق من المستخدم (auth)، ويدعم العديد من المنصات. لمزيد من المعلومات التفصيلية، راجع [وثائق Nuxt](https://nuxt.com/docs/getting-started/introduction).

## فهرس المحتويات

- [المتطلبات الأساسية](#المتطلبات-الأساسية)
- [الشروع في العمل](#الشروع-في-العمل)
- [التطوير](#التطوير)
- [تكوين البيئة](#تكوين-البيئة)
- [إعداد Docker](#إعداد-docker)
- [البناء للإنتاج](#البناء-للإنتاج)
- [تطبيق الجوال](#تطبيق-الجوال)
- [تطبيق Electron (تطبيقات الحاسوب)](#تطبيق-electron)
- [تطبيق Electrobun (تطبيقات الحاسوب الحديثة)](#تطبيق-electrobun)
- [تشغيل الموقع النهائي](#نشر-الإنتاج)
- [خادم البريد](#خادم-البريد)
- [تأمين الموقع](#تأمين-الموقع)
- [استكشاف الأخطاء وإصلاحها](#استكشاف-الأخطاء-وإصلاحها)

## المتطلبات الأساسية

قبل الشروع في هذا المشروع، تأكد من أن لديك الأدوات التالية مثبتة على نظامك:

- [Docker](https://docs.docker.com/get-docker/) و Docker Compose
- [pnpm](https://pnpm.io/) مدير الحزم (موصى به)
- [Bun](https://bun.sh/) بيئة تشغيل JavaScript (بديل)
- [Git](https://git-scm.com/) نظام التحكم في الإصدار

### تثبيت المتطلبات

**تثبيت Docker:**

```bash
# تنزيل وتشغيل البرنامج النصي الرسمي لتثبيت Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# إضافة المستخدم الحالي إلى مجموعة docker (Linux فقط)
sudo usermod -aG docker $USER
```

> [!IMPORTANT]  
> بعد تثبيت Docker، يُوصى باتباع [خطوات ما بعد التثبيت لـ Docker](https://docs.docker.com/engine/install/linux-postinstall/) لتعزيز الأمان والأداء، بما في ذلك تشغيل Docker كمستخدم غير جذر وتكوين خيارات الأمان الإضافية.

**تثبيت pnpm (موصى به):**

```bash
# باستخدام npm
npm install -g pnpm

# أو باستخدام نص التثبيت الرسمي
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**تثبيت Bun:**

```bash
# باستخدام المثبت الرسمي لـ Bun
curl -fsSL https://bun.sh/install | bash

# أو باستخدام npm
npm install -g bun
```

**تثبيت Git:**

```bash
# لـ Ubuntu/Debian
sudo apt install git
# لـ macOS
xcode-select --install
# لـ Windows، قم بتنزيله من https://git-scm.com/
```

> [!IMPORTANT]  
> بعد تشغيل `usermod -aG docker $USER`، يجب عليك تسجيل الخروج ثم تسجيل الدخول مرة أخرى أو إعادة التشغيل لتطبيق تغييرات مجموعة Docker. لمزيد من التكوينات بعد التثبيت، راجع [خطوات ما بعد التثبيت لـ Docker](https://docs.docker.com/engine/install/linux-postinstall/).

## الشروع في العمل

### استنساخ المستودع

```bash
git clone https://github.com/Bader-Idris/nuxt4-fullstack-portfolio.git ./portfolio

# يُوصى بإعادة تسمية دليل المشروع إلى 'portfolio' إذا لم تستخدم الأمر السابق
sudo mv nuxt4-fullstack-portfolio portfolio
cd portfolio
```

### تثبيت التبعيات

> [!IMPORTANT]  
> يُوصى بشدة باستخدام **pnpm** لتثبيت التبعيات وبناء المشروع، حيث أنه أكثر استقراراً ومختبر بشكل جيد لهذه الكود.

```bash
pnpm install
# pnpm config list && pnpm install --no-frozen-lockfile # recommended for locking and better at riskies of nuxt unstabilty
# bun install
```

### ترحيلات قاعدة البيانات

> [!IMPORTANT]  
> **ترحيل قاعدة البيانات حيوي للبناء الأول!** تم فصله بشكل قصدي عن عملية البناء الرئيسية لمنح السيطرة.

قبل تشغيل التطبيق، تأكد من أن مخطط قاعدة بياناتك محدث بتشغيل ترحيلات Prisma:

```bash
pnpm dlx prisma migrate deploy
pnpm dlx prisma generate
# bunx prisma migrate deploy
```

## التطوير

### بدء خادم التطوير

لبدء خادم التطوير، انتقل إلى `http://localhost:3000`:

```bash
pnpm dev
# bun run dev
```

> [!TIP]  
> للحصول على تجربة التطوير الكاملة مع جميع خدمات الخلفية، استخدم إعداد Docker كما هو موضح أدناه.

## تكوين البيئة

### متغيرات البيئة الأساسية

أنشئ تكوين بيئة من ملف المثال:

```bash
cp .env.example .env
```

> [!CAUTION]  
> عدل القيم في ملف `.env` لتحصل على خدماتك الخاصة.

> [!CAUTION]  
> إذا كنت تستخدم Windows، تأكد من تثبيت Git واستخدام Git Bash لتجربة تطوير محسنة.

### ملفات تكوين البيئة الخاصة بالمنصة

يتضمن المشروع تكوين بيئة لأنظمة مختلفة:

- `.env.example` - متغيرات بيئة التطبيق الرئيسي
- `.env.electron.example` - متغيرات بيئة تطبيق Electron
- `.env.capacitor.example` - متغيرات بيئة تطبيق الجوال

### أوامر MongoDB CLI v8

```sh
# للوصول إلى CLI:
docker exec -it mongo mongosh "mongodb://<Mongo_user>:<Mongo_password>@localhost:27017/portfolio?authSource=admin"
```

```js
show dbs
// اسم قاعدة البيانات الخاصة بك MONGO_DB_NAME
use MONGO_DB_NAME
show collections
// على سبيل المثال مجموعة المستخدمين
db.getCollection("users").find()
// للبحث في المجموعات:
db.users.find({ field: "value" }) // مثل
db.users.find({ "email": "contact@baderidris.com" })

// لتعديل الصلاحية بناءً على البريد الإلكتروني:
db.users.updateOne(
  { "email": "contact@baderidris.com" },
  { $set: { "role": "admin" } }
)
// للحذف:
db.users.deleteOne({ "email": "contact@baderidris.com" })
```

### أمر الترحيل من MongoDB 4.4.29 إلى 8.2.5

```sh
# بعد تنفيذ أمر النسخ الاحتياطي مع:
docker exec mongo sh -c 'mongodump --archive --gzip -u <Mongo_user> -p <Mongo_password> --authenticationDatabase admin' > /path/to/your/backup-4.4.gz
# بعض البيانات ستُفقد، لقد لاحظت أن المحادثات فُقدت! لكن ليس رسائل المشرفين!

# ثم نفذ هذا الأمر لاستعادة البيانات: (أفضل نهج هو الترحيل التسلسلي للإصدارات مثل 4 -> 5 -> 6 إلخ...)

docker exec -i mongo mongorestore \
  --archive --gzip \
  -u <Mongo_user> \
  -p <Mongo_password> \
  --authenticationDatabase admin \
  < /path/to/your/backup-4.4.gz

# وللتوافق نفذ هذا:
docker exec -it mongo mongosh -u <Mongo_user> -p <Mongo_password> --authenticationDatabase admin --eval '
  db.adminCommand({ setFeatureCompatibilityVersion: "8.2", confirm: true });
  db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 });
'

```

### أمر الترحيل من PostgreSQL 16 إلى 18

```sh
# 1. إنشاء نسخة احتياطية من بياناتك
docker exec psql pg_dump -U postgres articles > articles_backup.sql

# 2. الحفاظ على البيانات القديمة (اختياري ولكن موصى به)
docker volume create portfolio_psql-data-v16
docker run --rm -v portfolio_psql-data:/from -v portfolio_psql-data-v16:/to alpine ash -c "cd /from ; cp -av . /to"

# 3. تحديث ملف Docker Compose الخاص بك
# تغيير الصورة إلى postgres:18-alpine
# تغيير نقطة الربط من /var/lib/postgresql/data إلى /var/lib/postgresql

# 4. بدء تشغيل الحاوية الجديدة واستعادة البيانات
cat articles_backup.sql | docker exec -i psql psql -U postgres -d articles
```

### النسخ الاحتياطي الآلي (إعداد قوي)

يتضمن المشروع الآن خدمة نسخ احتياطي مخصصة باستخدام `nfrastack/container-db-backup` تقوم تلقائيًا بنسخ كل من PostgreSQL و MongoDB احتياطيًا كل 24 ساعة.

*   **التدوير (Rotation)**: يحتفظ بـ 7 أيام من النسخ الاحتياطية افتراضيًا (قابل للتكوين عبر `DEFAULT_CLEANUP_TIME`).
*   **التخزين**: يتم تخزين النسخ الاحتياطية في وحدة تخزين `backup-data`.
*   **دعم S3**: لتمكين النسخ الاحتياطي عن بُعد، قم بإلغاء التعليق وملء متغيرات بيئة S3 في `compose.prod.test.yaml` أو `compose.ssl.yaml`.

لعرض حالة النسخ الاحتياطي:
```sh
docker logs db-backup
```

لسرد النسخ الاحتياطية:
```sh
docker exec db-backup ls -lh /backup
```

## إعداد Docker

### بيئة التطوير

يستخدم المشروع Docker Compose لبيئة تطوير كاملة تتضمن جميع خدمات الخلفية الضرورية.

1. **تكوين متغيرات البيئة**

   ```bash
   cp .env.example .env
   # حرّر .env من نسخة المثال
   ```

2. **بدء خدمات Docker**

   ```bash
   docker compose -f b.dev.yml up -d --build
   ```

3. **الوصول إلى التطبيق**
   - الواجهة الأمامية: `http://localhost:3000`
   - سيتم تكوين خدمات الخلفية تلقائيًا

> [!WARNING]  
> يستخدم التطبيق خدمات خلفية مكثفة ويؤدي أفضل أداء مع Docker لتجربة متسقة.

### بيئة الإنتاج

> [!IMPORTANT]  
> تأكد من تثبيت Docker على جهاز الإنتاج.

لنشر في الإنتاج مع شهادات SSL:

```bash
docker compose -f ./a.prod-certbot.yml up -d --build
```

> [!IMPORTANT]  
> **حاسم**: يجب أن يُسمى مجلد المشروع `portfolio` للنشر الإنتاجي. تم تضمين تكوين Nginx لبحث الحاويات في دليل `portfolio`. إذا قمت باستنساخ المجلد باسم مختلف، يجب عليك إما إعادة تسمية المجلد إلى `portfolio` أو تحديث ملفات تكوين Nginx وفقًا لذلك.

## البناء للإنتاج

### بناء قياسي

لبناء التطبيق للإنتاج:

```bash
# حول ملف داكر إلى نسختك الخاصة
cp ./compose.prod.test.yaml.example ./compose.prod.test.yaml
# ومن ثم أوقف نسخة التطوير وابدأ في بناء المشروع
docker compose -f b.dev.yml down; docker compose -f compose.prod.test.yaml up -d redis postgres mongo ; docker compose -f compose.prod.test.yaml build --progress=plain app; docker compose -f compose.prod.test.yaml up -d
```

> [!CAUTION]  
> بناء التطبيق على خادم بموارد محدودة يُعتبر ممارسة سيئة. لأداء وموثوقية مثلى، نوصي بشدة باستخدام صورة Docker المبنية مسبقًا المتوفرة في [Docker Hub](https://hub.docker.com/r/baderidris/nuxt-portfolio) بدلاً من البناء من المصدر على الخادم. إذا كان لا بد من البناء على خادم ضعيف، يرجى اتباع التعليمات في ملف [weak_servers.md](./weak_servers.md) لضمان عملية بناء ناجحة.

لمعاينة البناء الإنتاجي محليًا:

```bash
pnpm preview
```


### صورة Docker للإنتاج

> [!TIP]  
> توجد صورة Docker مبنية مسبقًا في [Docker Hub](https://hub.docker.com/repository/docker/baderidris/nuxt-portfolio/general). يمكنك العثور على تعليمات حول كيفية سحب الصورة وتشغيلها مع Docker Compose في وثائق المستودع.

## تطبيق الجوال

### الإعداد

لإضافة دعم Android وiOS:

```bash
pnpm dlx cap add android ios
```

أنشئ ملف بيئة الجوال:

```bash
cp .env.capacitor.example .env.capacitor
# قم بتكوين متغيرات البيئة
```

### تخصيص أيقونات التطبيق

لتخصيص أيقونات تطبيقك، عدّل الأيقونات في مجلد `/assets` حسب الرغبة، ثم شغّل:

```bash
bunx capacitor-assets generate --assetPath "./app/assets" --ios --android
```

> يمكنك مراجعة متطلبات التكوين في ملف `assets/requirements.md`.

### إشعارات الدفع عبر Firebase

> [!WARNING]  
> مطلوب لمنع تعطل التطبيق مع إشعارات الدفع.

لتشغيله بشكل صحيح ومنع تعطل تطبيق الجوال، يجب أن يكون لديك الملف `android/app/google-services.json`. راجع [وثائق Capacitor](https://capacitorjs.com/docs/apis/push-notifications) و[وثائق Firebase](https://firebase.google.com/docs/android/setup#add-config-file).

### إعداد تطوير Android

لبناء تطبيق Android، تأكد من أنك قد ثبت [Android Studio](https://developer.android.com/studio/install) وعيّن متغيرات البيئة التالية:

- `ANDROID_HOME`
- `CAPACITOR_ANDROID_STUDIO_PATH`

> [!CAUTION]  
> أعد تشغيل جلسة shell بعد إضافة متغيرات البيئة.

### إصلاح توافق Android 15+

> [!CAUTION]  
> لتوافق Android 15+، بعد إنشاء مشروع Android، تحتاج إلى إضافة السطر التالي إلى كل قسم نمط مع `Theme.AppCompat.*` في الملف `android/app/src/main/res/values/styles.xml` لإصلاح خطأ overlay=true في Capacitor:

```xml
<item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
```

هذا يضمن سلوك العرض المناسب على أجهزة Android 15+ عند استخدام Capacitor مع إعدادات `overlay=true`.

يمكنك الاطلاع على المشكلة [هنا](https://github.com/ionic-team/capacitor-plugins/issues/2350#issuecomment-2904401405)

## تطبيق Electron

### الإعداد

لإنشاء بناء إنتاج لـ Electron:

1. أنشئ ملف بيئة Electron:

   ```bash
   cp .env.electron.example .env.electron
   # قم بتكوين متغيرات البيئة
   ```

2. استخدم الأوامر التالية لبناء تطبيق Electron:
   - `pnpm build:electron`: بناء للمنصة الحالية
   - `pnpm build:electron:all`: بناء لـ Windows وmacOS وLinux
   - `pnpm build:electron:win`: بناء لـ Windows فقط
   - `pnpm build:electron:mac`: بناء لـ macOS فقط
   - `pnpm build:electron:linux`: بناء لـ Linux فقط
   - `pnpm build:electron:dir`: بناء في دليل غير مضغوط للاختبار

### التثبيت على Linux

بالنسبة لتوزيعات Linux، يتم دعم التنسيقات التالية:

- **DEB**: الأفضل لـ Ubuntu/Debian. تثبيت سلس عبر الواجهة الرسومية أو الطرفية (Terminal) باستخدام `sudo dpkg -i <file>.deb`.
- **AppImage**: محمول ويعمل على معظم التوزيعات. تأكد من منحه صلاحيات التنفيذ:
  ```bash
  chmod +x portfolio.AppImage
  ./portfolio.AppImage
  ```
- **Snap**: محدود بشكل صارم وآمن. نظرًا لأن البناء المحلي غير موقع، يجب عليك التثبيت باستخدام الطرفية (Terminal):
  ```bash
  sudo snap install --dangerous nuxt4-fullstack-portfolio_3.4.0_linux_amd64.snap
  ```

## تطبيق Electrobun

بديل حديث وخفيف لـ Electron يستخدم Bun وعارض الويب الخاص بالنظام (system webviews).

### الإعداد

1. استخدم ملف بيئة Electron الحالي أو أنشئ ملفاً مخصصاً إذا لزم الأمر.

2. استخدم الأوامر التالية لبناء أو تطوير تطبيق Electrobun:
   - `bun run dev:electrobun`: تشغيل وضع التطوير مع HMR ونافذة أصلية.
   - `bun run build:electrobun`: بناء للمنصة الحالية.
   - `bun run build:electrobun:all`: بناء لـ Windows وmacOS وLinux بالتتابع.
   - `bun run build:electrobun:win`: بناء لـ Windows فقط.
   - `bun run build:electrobun:mac`: بناء لـ macOS فقط.
   - `bun run build:electrobun:linux`: بناء لـ Linux فقط.

سيتم تنظيم الإصدارات وتأريخها في `./release/electrobun/${version}_${timestamp}/`.

### تكوين النطاق

تأكد من تحديث اسم النطاق `baderidris.com` في الملف `b.dev.yml` وفي ملفات التكوين المرتبطة باسم النطاق الخاص بك.

## نشر الإنتاج

### إدارة شهادة SSL

> [!IMPORTANT]
> **`compose.ssl.yaml` هو القالب الآمن للإنتاج مع SSL.**
> إنه نسخة مفلترة من `b.comp.prod.yaml` حيث تم استبدال كل سر مُضمَّن بمرجع متغير بيئي. **لا تشغّله أبدًا قبل ملء ملف البيئة الخاص بك.**

قبل البدء، انسخ ملف البيئة النموذجي واملأ بياناتك:

```bash
cp .env.ssl.example .env.production
# ثم عدّل .env.production وأدخل جميع القيم المطلوبة
```

| المتغير | الوصف |
|---|---|
| `DOMAIN` | النطاق الرئيسي (مثل `baderidris.com`) |
| `MAIL_HOSTNAME` | الاسم الكامل لخادم البريد (مثل `mail.baderidris.com`) |
| `CERTBOT_EMAIL` | البريد الإلكتروني المستخدم لإشعارات Let's Encrypt |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` | بيانات اعتماد MongoDB الجذرية |
| `REDIS_PASSWORD` | كلمة مرور مصادقة Redis |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | بيانات اعتماد PostgreSQL |
| `SESSION_SECRET` / `JWT_SECRET` | أسرار توقيع الجلسة و JWT |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | بيانات اعتماد OAuth لـ Google |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | بيانات اعتماد OAuth لـ Facebook |
| `SENDGRID_API_KEY` | مفتاح API لـ SendGrid لإرسال الرسائل |
| `MAIL_USER` / `MAIL_PASS` | بيانات اعتماد حساب البريد SMTP |

ثم شغّل الخدمات بـ:

```bash
docker compose -f compose.ssl.yaml --env-file .env.production up -d
```

> [!TIP]
> لفهم شامل لنهج النسخ الاحتياطي "Robusten" الخاص بنا، وكيفية استعادة البيانات في حالات الطوارئ، وتكامل S3، راجع [**خطة النسخ الاحتياطي الرئيسية Robusten**](./docs/BACKUPS.md).

#### إعداد تجديد الشهادة

لأتمتة تجديد الشهادات، أنشئ مهمة cron عن طريق تعديل المسارات في الملف `/server/config/nginx/ssl_renew.sh`، ثم أضف هذا إلى crontab:

```bash
# لتحرير crontab، شغّل:
crontab -e

# أضف السطر التالي لجدولة نص البرمجة للتجديد:
0 12 * * * /home/bader/portfolio/server/config/nginx/ssl_renew.sh >> /var/log/cron.log 2>&1
```

> [!TIP]  
> راجع ملف `ssl_renew.sh` لمزيد من النصائح والمكونات المفيدة.

#### إعداد الشهادة بعد النشر

بعد النشر الأولي، ستحتاج إلى إجبار Certbot على تجديد الشهادات لإزالة علامة `--staging`. يُوصى بإنشاء ملف compose منفصل لهذا الغرض وللتجديدات المستقبلية.

## خادم البريد

يتضمن المشروع إعدادًا كاملاً لخادم بريد يعمل على `mail.baderidris.com`. تم بناؤه باستخدام Docker Mailserver ويدعم تقنيات DKIM و SPF و DMARC و MTA-STS.

للحصول على تعليمات مفصلة حول كيفية تكوين وإدارة خادم البريد، بما في ذلك سجلات DNS وإدارة المستخدمين، يرجى مراجعة [نص إعداد خادم البريد](./server/config/mailserver/whatToDoOnMailserver.sh) و [الوثائق التفصيلية](./docs/README.md).

## تأمين الموقع

لتعزيز أمن تطبيقك ومنع الهجمات الشائعة مثل DDoS، تم تنفيذ Fail2Ban.

### تكوين Fail2Ban

الملفات التالية مدرجة في تكوين الأمان:

```bash
ls server/config/fail2ban/
# يحتوي على:
# - دليل filter.d
# - ملف my_custom_jail.local
```

### السجون والمرشحات المخصصة

تم إنشاء سجون ومرشحات مخصصة تسمح للمستخدمين بإضافة تكويناتهم بعد تثبيت الأداة. توفر هذه المرونة مساعدتك في تخصيص إعدادات الأمان وفقًا لاحتياجاتك المحددة.

## استكشاف الأخطاء وإصلاحها

### المشاكل الشائعة

- **استقرار pnpm**: راجع [دليل استقرار pnpm](./docs/PNPM_STABILITY_GUIDE.md) للحصول على تعليمات حول قفل إصدارات التبعيات وإصلاح فشل بناء Docker.
- **Builds الخوادم الضعيفة**: راجع [weak_servers.md](./weak_servers.md) للحصول على إرشادات حول تحسين البناء للموارد المحدودة
- **مشكلات Docker**: تأكد من تثبيت Docker وDocker Compose وتشغيلهما بشكل صحيح
- **متغيرات البيئة**: تأكد من تكوين جميع متغيرات البيئة المطلوبة بشكل صحيح

## المجتمع

انضم إلى مناقشات مجتمعنا! لا تتردد في التواصل مع المشرف والأعضاء الآخرين في المجتمع على [مناقشات GitHub](https://github.com/Bader-Idris/nuxt4-fullstack-portfolio/discussions).

---

شكرًا لاستخدام تطبيق المحفظة متعدد الطبقات! إذا كانت لديك أسئلة أو تحتاج إلى مساعدة إضافية، فلا تتردد في التواصل.عة

- **استقرار pnpm**: راجع [دليل استقرار pnpm](./docs/PNPM_STABILITY_GUIDE.md) للحصول على تعليمات حول قفل إصدارات التبعيات وإصلاح فشل بناء Docker.
- **Builds الخوادم الضعيفة**: راجع [weak_servers.md](./weak_servers.md) للحصول على إرشادات حول تحسين البناء للموارد المحدودة
- **مشكلات Docker**: تأكد من تثبيت Docker وDocker Compose وتشغيلهما بشكل صحيح
- **متغيرات البيئة**: تأكد من تكوين جميع متغيرات البيئة المطلوبة بشكل صحيح

## المجتمع

انضم إلى مناقشات مجتمعنا! لا تتردد في التواصل مع المشرف والأعضاء الآخرين في المجتمع على [مناقشات GitHub](https://github.com/Bader-Idris/nuxt4-fullstack-portfolio/discussions).

---

شكرًا لاستخدام تطبيق المحفظة متعدد الطبقات! إذا كانت لديك أسئلة أو تحتاج إلى مساعدة إضافية، فلا تتردد في التواصل.
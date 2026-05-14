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

[![project img](https://raw.githubusercontent.com/Bader-Idris/nuxt3-fullstack-portfolio/26e3f86aaa361639f25b0ce933df59ea982e5e41/client/public/thumbnail-ar.png)](https://baderidris.com)

تطبيق شامل متعدد الطبقات والميزات مبني باستخدام Nuxt 4، يحتوي على ميزات الاتصال الفوري (websocket)، التحقق من المستخدم (auth)، ويدعم العديد من  المنصات. لمزيد من المعلومات التفصيلية، راجع [وثائق Nuxt](https://nuxt.com/docs/getting-started/introduction).

## فهرس المحتويات

- [المتطلبات الأساسية](#المتطلبات-الأساسية)
- [الشروع في العمل](#الشروع-في-العمل)
- [التطوير](#التطوير)
- [تكوين البيئة](#تكوين-البيئة)
- [إعداد Docker](#إعداد-docker)
- [البناء للإنتاج](#البناء-للإنتاج)
- [تطبيق الجوال](#تطبيق-الجوال)
- [تطبيق Electron (تطبيقات الحاسوب)](#تطبيق-electron)
- [تشغيل الموقع النهائي](#نشر-الإنتاج)
- [خادم البريد](#خادم-البريد)
- [تأمين الموقع](#تأمين-الموقع)
- [استكشاف الأخطاء وإصلاحها](#استكشاف-الأخطاء-وإصلاحها)

## المتطلبات الأساسية

قبل الشروع في هذا المشروع، تأكد من أن لديك الأدوات التالية مثبتة على نظامك:

- [Docker](https://docs.docker.com/get-docker/) و Docker Compose
- [Bun](https://bun.sh/) بيئة تشغيل JavaScript
- نظام التحكم في الإصدار Git

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
> تأكد من أنك قد ثبت Bun قبل تشغيل هذه الأوامر.

```bash
bun install
```

### ترحيلات قاعدة البيانات

> [!IMPORTANT]  
> **ترحيل قاعدة البيانات حيوي للبناء الأول!** تم فصله بشكل قصدي عن عملية البناء الرئيسية لمنح السيطرة.

قبل تشغيل التطبيق، تأكد من أن مخطط قاعدة بياناتك محدث بتشغيل ترحيلات Prisma:

```bash
bunx prisma migrate deploy
bunx prisma generate
```

## التطوير

### بدء خادم التطوير

لبدء خادم التطوير، انتقل إلى `http://localhost:3000`:

```bash
bun run dev
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
bun run preview
```

### صورة Docker للإنتاج

> [!TIP]  
> توجد صورة Docker مبنية مسبقًا في [Docker Hub](https://hub.docker.com/repository/docker/baderidris/nuxt-portfolio/general). يمكنك العثور على تعليمات حول كيفية سحب الصورة وتشغيلها مع Docker Compose في وثائق المستودع.

## تطبيق الجوال

### الإعداد

لإضافة دعم Android وiOS:

```bash
bunx cap add android ios
```

أنشئ ملف بيئة الجوال:

```bash
cp .env.capacitor.example .env.capacitor
# قم بتكوين متغيرات البيئة
```

### تخصيص أيقونات التطبيق

لتخصيص أيقونات تطبيقك، عدّل الأيقونات في مجلد `/assets` حسب الرغبة، ثم شغّل:

```bash
bunx capacitor-assets generate --assetPath "./assets" --ios --android
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

   - `bun run build:electron`: بناء للمنصة الحالية
   - `bun run build:electron:all`: بناء لـ Windows وmacOS وLinux
   - `bun run build:electron:win`: بناء لـ Windows فقط
   - `bun run build:electron:mac`: بناء لـ macOS فقط
   - `bun run build:electron:linux`: بناء لـ Linux فقط
   - `bun run build:electron:dir`: بناء في دليل غير مضغوط للاختبار

### تكوين النطاق

تأكد من تحديث اسم النطاق `baderidris.com` في الملف `b.dev.yml` وفي ملفات التكوين المرتبطة باسم النطاق الخاص بك.

## نشر الإنتاج

### إدارة شهادة SSL

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

- **Builds الخوادم الضعيفة**: راجع [weak_servers.md](./weak_servers.md) للحصول على إرشادات حول تحسين البناء للموارد المحدودة
- **مشكلات Docker**: تأكد من تثبيت Docker وDocker Compose وتشغيلهما بشكل صحيح
- **متغيرات البيئة**: تأكد من تكوين جميع متغيرات البيئة المطلوبة بشكل صحيح

## المجتمع

انضم إلى مناقشات مجتمعنا! لا تتردد في التواصل مع المشرف والأعضاء الآخرين في المجتمع على [مناقشات GitHub](https://github.com/Bader-Idris/nuxt4-fullstack-portfolio/discussions).

---

شكرًا لاستخدام تطبيق المحفظة متعدد الطبقات! إذا كانت لديك أسئلة أو تحتاج إلى مساعدة إضافية، فلا تتردد في التواصل.
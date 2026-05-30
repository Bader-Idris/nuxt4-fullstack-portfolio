export interface LocalizedString {
  en: string;
  ar: string;
  es: string;
}

export interface Project {
  title: LocalizedString;
  url: string;
  img: string;
  imgAlt: string;
  desc: LocalizedString;
  tags: string[];
}

export const projectsList: Project[] = [
  {
    title: {
      en: "e-commerce product page",
      ar: "صفحة منتج التجارة الإلكترونية",
      es: "Página de producto de comercio electrónico",
    },
    url: "https://bader-idris.github.io/ecommerce-product-page/",
    img: "https://raw.githubusercontent.com/Bader-Idris/ecommerce-product-page/main/design/desktop-preview.jpg",
    imgAlt: "",
    desc: {
      en: "Interactive and responsive e-commerce product page, you can add and remove items from cart and see the total amount of items in the cart, and navigate through the images of the product",
      ar: "صفحة منتج تجارة إلكترونية تفاعلية ومتجاوبة، يمكنك إضافة وإزالة العناصر من السلة ورؤية إجمالي العناصر، والتنقل عبر صور المنتج",
      es: "Página de producto de comercio electrónico interactiva y receptiva, puede agregar y eliminar artículos del carrito y ver la cantidad total de artículos en el carrito, y navegar a través de las imágenes del producto",
    },
    tags: ["html", "css", "Javascript"],
  },
  {
    title: {
      en: "My First 3D Challenge: Steaming Into The Horizon",
      ar: "تحدي ثلاثي الأبعاد الأول: الانطلاق نحو الأفق",
      es: "Mi primer desafío 3D: Rumbo al horizonte",
    },
    url: "/projects/train",
    img: "/imgs/train-thumbnail-2026-05-5.webp",
    imgAlt: "Locomotive ready to race",
    desc: {
      en: "High-fidelity 3D locomotive simulation with professional shadow tuning, angular-sort path extraction, dynamic chimney steam, and a reactive suspension system on an interactive terrain!!",
      ar: "محاكاة قاطرة ثلاثية الأبعاد عالية الدقة مع ضبط احترافي للظلال، واستخراج مسار الفرز الزاوي، وبخار مدخنة ديناميكي، ونظام تعليق تفاعلي على تضاريس تفاعلية!!",
      es: "¡Simulación de locomotora 3D de alta fidelidad con ajuste de sombras profesional, extracción de rutas de clasificación angular, vapor de chimenea dinámico y un sistema de suspensión reactivo en un terreno interactivo!",
    },
    tags: ["Docker", "Typescript", "Nginx", "Nuxt", "Sass", "Electron", "ThreeJs", "CapacitorJs"],
  },
  {
    title: {
      en: "designing agency web app clone",
      ar: "نسخة تطبيق ويب لوكالة تصميم",
      es: "Clon de aplicación web de agencia de diseño",
    },
    url: "https://beautiful-web-application.netlify.app/",
    img: "https://raw.githubusercontent.com/Bader-Idris/guru-agency-duplication-site/refs/heads/bader/brave_703HxjzGmt.png",
    imgAlt: "designing agency web app",
    desc: {
      en: "A stunning web application designed for a designing agency, showcasing beautiful CSS interactions. The app features an innovative background color conversion effect on hover, as well as various text manipulation techniques, making it a visually appealing and engaging experience for users. As a full-stack developer, I would be delighted to help you bring such a project to life.",
      ar: "تطبيق ويب مذهل مصمم لوكالة تصميم، يعرض تفاعلات CSS جميلة. يتميز التطبيق بتأثير مبتكر لتحويل لون الخلفية عند التحويم، بالإضافة إلى تقنيات مختلفة للتلاعب بالنصوص، مما يجعله تجربة جذابة بصريًا للمستخدمين.",
      es: "Una impresionante aplicación web diseñada para una agencia de diseño, que muestra hermosas interacciones CSS. La aplicación presenta un innovador efecto de conversión de color de fondo al pasar el mouse, así como varias técnicas de manipulación de texto, lo que la convierte en una experiencia visualmente atractiva y atractiva para los usuarios.",
    },
    tags: ["html", "sass", "Vue", "typescript"],
  },
  {
    title: {
      en: "Countries API",
      ar: "واجهة برمجة تطبيقات البلدان",
      es: "API de Países",
    },
    url: "https://countries-apis-bader.netlify.app/",
    img: "https://raw.githubusercontent.com/Bader-Idris/countries-api/refs/heads/bader/design-assets/design/desktop-preview.jpg",
    imgAlt: "countries api with dark/light mode",
    desc: {
      en: "Explore global data with this sleek, responsive app. Fetch country details, toggle dark/light mode, and search or filter by region effortlessly.",
      ar: "استكشف البيانات العالمية مع هذا التطبيق المتجاوب والأنيق. جلب تفاصيل البلدان، تبديل الوضع الداكن/المضيء، والبحث أو التصفية حسب المنطقة بسهولة.",
      es: "Explore datos globales con esta aplicación elegante y receptiva. Obtenga detalles de los países, cambie entre el modo oscuro/claro y busque o filtre por región sin esfuerzo.",
    },
    tags: ["html", "Sass", "Vue", "typescript"],
  },
  {
    title: {
      en: "Pricing page",
      ar: "صفحة الأسعار",
      es: "Página de precios",
    },
    url: "https://bader-idris.github.io/pricing_options_page/",
    img: "https://raw.githubusercontent.com/Bader-Idris/pricing_options_page/main/design/desktop-preview.jpg",
    imgAlt: "",
    desc: {
      en: "Explore my interactive and responsive pricing page with a variety of plans, offering both yearly and monthly subscriptions. Choose from three main plans tailored to your needs.",
      ar: "استكشف صفحة الأسعار التفاعلية والمتجاوبة مع مجموعة متنوعة من الخطط، التي توفر اشتراكات سنوية وشهرية. اختر من بين ثلاث خطط رئيسية مصممة لاحتياجاتك.",
      es: "Explore mi página de precios interactiva y receptiva con una variedad de planes, que ofrece suscripciones anuales y mensuales. Elija entre tres planes principales adaptados a sus necesidades.",
    },
    tags: ["html", "css", "Javascript"],
  },
  {
    title: {
      en: "Todo app",
      ar: "تطبيق المهام",
      es: "Aplicación de tareas",
    },
    url: "https://bader-idris.github.io/todo-app/",
    img: "https://raw.githubusercontent.com/Bader-Idris/todo-app/main/screenshots/dark-desk.png",
    imgAlt: "",
    desc: {
      en: "A todo app that relies on local storage, so you can safely exit the page, and go back when needed. It's a responsive and interactive todo app that allows you to add, remove, mark as done, and filter tasks",
      ar: "تطبيق مهام يعتمد على التخزين المحلي، لذا يمكنك الخروج من الصفحة بأمان والعودة عند الحاجة. إنه تطبيق مهام متجاوب وتفاعلي يتيح لك إضافة وإزالة وضع علامة على المهام المكتملة وتصفية المهام",
      es: "Una aplicación de tareas que se basa en el almacenamiento local, por lo que puede salir de la página de forma segura y volver cuando sea necesario. Es una aplicación de tareas interactiva y receptiva que le permite agregar, eliminar, marcar como completada y filtrar tareas.",
    },
    tags: ["html", "css", "Javascript"],
  },
  {
    title: {
      en: "multi-step form",
      ar: "نموذج متعدد الخطوات",
      es: "Formulario de varios pasos",
    },
    url: "https://bader-idris.github.io/multi-step-form/",
    img: "https://raw.githubusercontent.com/Bader-Idris/multi-step-form/main/design/desktop-preview.jpg",
    imgAlt: "",
    desc: {
      en: "I'm proud to showcase a highly advanced, user-friendly, and visually appealing multi-step form, consisting of 4 steps, including a thank you page, which is a perfect example of how I can successfully connect many DOM elements with a single button, making it a very appealing user experience for clients to click and explore.",
      ar: "أنا فخور بعرض نموذج متعدد الخطوات متقدم للغاية وسهل الاستخدام وجذاب بصريًا، يتكون من 4 خطوات، بما في ذلك صفحة الشكر، وهو مثال مثالي لكيفية ربط العديد من عناصر DOM بنجاح بضغطة زر واحدة.",
      es: "Me enorgullece mostrar un formulario de varios pasos muy avanzado, fácil de usar y visualmente atractivo, que consta de 4 pasos, incluida una página de agradecimiento, que es un ejemplo perfecto de cómo puedo conectar con éxito muchos elementos DOM con un solo botón.",
    },
    tags: ["html", "css", "Javascript"],
  },
  {
    title: {
      en: "Random Quotes Generator",
      ar: "مولد الاقتباسات العشوائية",
      es: "Generador de Citas Aleatorias",
    },
    url: "https://bader-idris.github.io/random-quote/",
    img: "https://raw.githubusercontent.com/Bader-Idris/random-quote/refs/heads/main/Screenshot%20from%202025-01-12%2021-39-33.png",
    imgAlt: "generating random quotes web application",
    desc: {
      en: "Get inspired with random quotes! This clean, responsive app features a stylish dice button to generate fresh quotes instantly.",
      ar: "احصل على الإلهام مع الاقتباسات العشوائية! يتميز هذا التطبيق النظيف والمتجاوب بزر نرد أنيق لتوليد اقتباسات جديدة على الفور.",
      es: "¡Inspírate con citas aleatorias! Esta aplicación limpia y receptiva cuenta con un elegante botón de dados para generar nuevas citas al instante.",
    },
    tags: ["html", "css", "Javascript"],
  },
  {
    title: {
      en: "Arabic characters game",
      ar: "لعبة الحروف العربية",
      es: "Juego de caracteres árabes",
    },
    url: "http://letters-game.online",
    img: "/imgs/letters-game-image.webp",
    imgAlt: "Arabic characters game img",
    desc: {
      en: "A competitive game based on Arabic letters using websocket, an advanced deep project built in two months of development. Developed over 250 hours, utilizing Docker, Docker Compose, Nginx, Redis, MongoDB, Nuxt 3, and Nitro 2, with deep experience in Socket.io and Websockets. The project includes SCSS, HTML5, CSS3, and TLS layer management, along with Pinia for state management, totaling around 10,000 lines of code primarily focused on Socket.io, Pinia, and the backend with Nitro 2 and MongoDB.",
      ar: "لعبة تنافسية تعتمد على الحروف العربية باستخدام websocket، وهو مشروع عميق متقدم تم بناؤه في شهرين من التطوير. تم تطويره على مدار أكثر من 250 ساعة، باستخدام Docker و Docker Compose و Nginx و Redis و MongoDB و Nuxt 3 و Nitro 2.",
      es: "Un juego competitivo basado en letras árabes usando websocket, un proyecto avanzado profundo construido en dos meses de desarrollo. Desarrollado durante más de 250 horas, utilizando Docker, Docker Compose, Nginx, Redis, MongoDB, Nuxt 3 y Nitro 2.",
    },
    tags: ["Docker", "Typescript", "Nginx", "Nuxt", "Sass"],
  },
  {
    title: {
      en: "50 Frontend Challenges: Elzero Edition",
      ar: "50 تحدي واجهة أمامية: إصدار الزيرو",
      es: "50 desafíos de interfaz de usuario: Edición Elzero",
    },
    url: "/projects/elzero-50-projects",
    img: "https://raw.githubusercontent.com/Bader-Idris/50projects50days/master/expanding-cards/screenshot.png",
    imgAlt: "Elzero 50 Projects Challenge Showcase",
    desc: {
      en: "A premium, interactive showcase of 50 frontend challenges from the Elzero Web School. Features a VSCode-style explorer, live playground previews, and full support for English, Arabic, and Spanish.",
      ar: "عرض تفاعلي متميز لـ 50 تحديًا للواجهة الأمامية من مدرسة الزيرو. يتميز بمستكشف بنمط VSCode، ومعاينات مباشرة للملعب، ودعم كامل للغات الإنجليزية والعربية والإسبانية.",
      es: "Una muestra interactiva premium de 50 desafíos de frontend de Elzero Web School. Cuenta con un explorador estilo VSCode, vistas previas de juegos en vivo y soporte completo para inglés, árabe y español.",
    },
    tags: ["HTML", "CSS", "Javascript", "Nuxt", "Typescript", "Sass"],
  },
];

import { name, version } from "../../../../package.json";

const APP_NAME = name.charAt(0).toUpperCase() + name.slice(1);
const APP_VERSION = version;
const IS_DEV_ENV = process.env.NODE_ENV === "development";

const DEV_SERVER_URL = `http://localhost:3000`;
const PROD_INDEX_URL = "views://mainview/index.html";

export default {
  APP_NAME,
  APP_VERSION,
  IS_DEV_ENV,
  DEV_SERVER_URL,
  PROD_INDEX_URL,
};

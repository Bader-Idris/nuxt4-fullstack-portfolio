export default defineEventHandler((event) => {
  // You can generate or fetch the content dynamically here
  // return "google.com, pub-GOOGLE_ADSENSE_ID, DIRECT, f08c47fec0942fa0";
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return ".";
});

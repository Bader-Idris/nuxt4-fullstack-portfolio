export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/plain');
  // You can generate or fetch the content dynamically here
  // return "google.com, pub-GOOGLE_ADSENSE_ID, DIRECT, f08c47fec0942fa0";
  return `User-agent: *\nDisallow: /`;
});

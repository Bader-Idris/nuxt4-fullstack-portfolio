export default defineEventHandler((event) => {
  // definitive removal of the x-powered-by header
  // we use removeResponseHeader for cross-platform compatibility (Node, Bun, Deno)
  removeResponseHeader(event, 'x-powered-by')
})

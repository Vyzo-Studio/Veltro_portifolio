/* VELTRO isolated backend configuration.
 * Intentionally disabled until a new Supabase project and dedicated Auth
 * account exist. Never copy values from the GNG or Haus databases.
 * Only the project URL and publishable key may appear in a browser bundle.
 */
window.VELTRO_BACKEND = Object.freeze({
  ready: false,
  url: "",
  publishableKey: ""
});
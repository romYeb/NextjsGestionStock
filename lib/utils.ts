const SUPABASE_URL = "https://zwhiiatakzqueszxwgnj.supabase.co"

/**
 * Construit l'URL publique d'une image dans Supabase Storage
 * @param path Chemin commençant par `/uploads/...` ou déjà une URL complète
 */
export function getPublicImageUrl(path: string) {
  if (!path) return ""
  if (path.startsWith("http")) return path // ✅ ne rien changer si c'est déjà une URL
  return `${SUPABASE_URL}/storage/v1/object/public${path}`
}

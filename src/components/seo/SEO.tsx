import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "Sakura Nihongo";
const SITE_URL =
  typeof window !== "undefined" ? window.location.origin : "https://sakura-nihongo.lovable.app";
const DEFAULT_IMAGE = "/icons/icon-192x192.svg";

export interface SEOProps {
  /** <60 ký tự, sẽ tự nối " | Sakura Nihongo" trừ khi `noSuffix` */
  title: string;
  /** <160 ký tự */
  description?: string;
  /** Đường dẫn canonical (tương đối được; sẽ ghép với origin) */
  canonical?: string;
  image?: string;
  /** Chặn index (vd: trang admin, auth) */
  noindex?: boolean;
  /** og:type, mặc định "website" */
  type?: "website" | "article" | "profile";
  /** JSON-LD structured data (object thuần) */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  noSuffix?: boolean;
  lang?: string;
}

/**
 * Reusable <head> manager. Đặt trong mỗi page route để có meta SEO/OG riêng.
 * Vì đây là SPA, crawler hiện đại (Googlebot, Bingbot) sẽ chạy JS → meta sẽ
 * được index. Cho social share (Facebook/Twitter) thì cần SSR — đó là giới
 * hạn của kiến trúc hiện tại.
 */
export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  noindex = false,
  type = "website",
  jsonLd,
  noSuffix = false,
  lang = "vi",
}) => {
  const fullTitle = noSuffix ? title : `${title} | ${SITE_NAME}`;
  const url = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${SITE_URL}${canonical.startsWith("/") ? canonical : `/${canonical}`}`
    : SITE_URL;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={imageUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={imageUrl} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEO;

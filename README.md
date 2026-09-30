# Adil Oyun Endeksi

Süper Lig'de hakem kararlarının gözlemlenebilir sportif sonuçlarını, niyet atfetmeden ve kaynak temelli biçimde incelemek için tasarlanmış statik Next.js uygulaması.

## Geliştirme

```bash
# Süper Lig Adil Oyun Endeksi

Süper Lig'in dört büyük takımı için hakem ve maç verilerinin gözlemlenebilir sportif etkilerini inceleyen, kaynakları ve hesaplama yöntemi açık bir futbol analitiği projesi. Uygulama 2023-24, 2024-25 ve 2025-26 sezonlarını kapsar ve Cloudflare Pages'te yayımlanabilen statik bir Next.js uygulaması olarak derlenir.

Endeks, hakemlerin veya kurumların niyetini ölçmez. Pozitif ya da negatif skor kasıtlı kayırma veya mağduriyet kanıtı değildir. Penaltı verisi, TFF kayıtlarında `(P)` ile gösterilen penaltı gollerini ifade eder; kararın doğruluğunu değerlendirmez. Kadroda görünmeyen bir oyuncu da tıbbi kaynak olmadan sakat olarak etiketlenmez.

## Uygulama

- Ana sayfa: sezonlar arası endeks sıralaması, bileşenler ve veri kapsamı.
- `/data`: olay ve maç kayıtlarını incelemek için veri gezgini.
- `/methodology`: puanlama formülü, ağırlıklar ve güven yaklaşımı.
- `/sources`: kaynaklar, türetilmiş ölçümler ve doğrulama sınırları.
- `/test`: içe aktarılan maç verilerinin özet kontrol görünümü.

## Başlangıç

Gereksinimler: Next.js 16 ile uyumlu Node.js sürümü ve npm.

```bash
npm ci
npm run dev
```

Geliştirme sunucusu varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde açılır.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Yerel geliştirme sunucusunu başlatır. |
| `npm run lint` | ESLint kontrollerini çalıştırır. |
| `npm test` | Vitest testlerini çalıştırır. |
| `npm run build` | Statik siteyi derleyip `out/` dizinine yazar. |
| `npm run pages:build` | Cloudflare Pages için statik derleme yapar. |
| `npm run pages:deploy` | `out/` içeriğini Wrangler ile Cloudflare Pages'e yükler. |
| `npm run data:import:tff` | Üç sezonun TFF fikstür ve maç detaylarını yeniden içe aktarır. |

## Veri ve güncelleme

Uygulama canlı TFF sorgusu yapmaz; derleme sırasında repodaki JSON dosyalarını kullanır. Kaynak snapshot'ları `data/raw/tff/`, normalize edilmiş dört büyük maç verisi `data/normalized/big-four-matches.json` içindedir. İçe aktarma özeti, kaynak URL'leri, erişim zamanı, kayıt sayısı ve SHA-256 değerleri `data/sources-manifest.json` dosyasında tutulur.

Veriyi yenilemek için:

```bash
npm run data:import:tff
```

Komut TFF'den yeniden veri indirir ve ham snapshot'lar, normalize veri ile kaynak manifestini günceller. Oluşan farkları inceleyip doğrulamadan değişiklikleri yayımlamayın. Eksik olaylar fikstür sonuçlarından tahmin edilmez. Veri dosyaları ve içe aktarma ayrıntıları için [`data/README.md`](data/README.md) dosyasına bakın.

Olay defterindeki kart, penaltı golü ve bazı maç bağlamı kayıtları TFF verisinden doğrulanır. Dinlenme aralığı, maç öncesi rakip gücü, kart sonrası kadroda bulunmama ve kadro sürekliliği açık kurallarla türetilir. Kadroda bulunmama nedeni doğrulanmış ceza ya da sağlık bilgisi olarak sunulmaz. Bekleyen örnek/mock kayıt puanlama motorunca dışarıda bırakılır.

## Puanlama yaklaşımı

Olayların etkisi ham etki, güven katsayısı ve kategori ağırlığı üzerinden hesaplanır. Aynı `eventId` puanlamada bir kez işlenir. Veri yokluğu sıfır etki olarak varsayılmaz; bilinmeyen ölçümler ayrı tutulur. Başlangıç ağırlıkları ve normalizasyon yaklaşımı uygulamadaki `/methodology` sayfasında açıklanır.

## Cloudflare Pages

Proje Next.js statik export kullanır. Cloudflare Pages projesinde build komutu `npm run pages:build`, çıktı dizini `out` olmalıdır. Depo Pages'e bağlandıktan sonra her dağıtım bu derleme ayarlarıyla yapılabilir.

Cloudflare hesabında oturum açmış yerel ortamdan elle dağıtım:

```bash
npm run pages:build
npm run pages:deploy
```

Özel alan adı Cloudflare Pages projesinin **Custom domains** bölümünden yapılandırılır.


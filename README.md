# Adil Oyun Endeksi
'Amaç hakemler x takımı kayırdı' iddasını bilimsel bir zemine oturtmaya çalışmak. bunun için ölçülebilir değerlerin futbola olan etkisini bir formüle döktüm. fork edebilir yada geliştirmem için bana info@orcuncandan.com adresinden ulaşabilirsiniz

## Geliştirme
4 büyük takımın gördüğü ve rakiplerinin gördüğü kartlar, bu kartların kritik maçlar öncesinde olup olmadığı, kazanılan ve verilen penaltılar, sakatlıklar, Kart gören oyuncuların takım içindeki değeri gibi kriterler üzerinden bir hesaplama yapmaya çalıştım

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


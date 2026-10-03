# SüperLig Avantaj / Dezavantaj Endeksi

[Canlı uygulama](https://superlig.orcuncandan.com/) · [Veri gezgini](https://superlig.orcuncandan.com/data) · [Metodoloji](https://superlig.orcuncandan.com/methodology) · [Kaynaklar](https://superlig.orcuncandan.com/sources)

Üç Süper Lig sezonunun maç ve olay kayıtlarını kaynak bağlantılarıyla incelemeyi sağlayan Next.js veri uygulaması. Galatasaray, Fenerbahçe, Beşiktaş ve Trabzonspor için doğrulanmış penaltı kararlarını ve önemli maçlarda değerli oyuncuların doğrulanmış ceza etkilerini açık kurallarla hesaplar.

## Kapsam ve yorumlama

- Endeks, hakem hatası, kasıtlı kayırma veya mağduriyet kanıtı değildir.
- Normal kartlar, sakatlıklar, maç sonuçları ve kadroda bulunmama tek başına puanlanmaz.
- Penaltı kararı; gol, kaçırma veya kurtarılmadan bağımsız değerlendirilir.
- Ceza etkisi için ceza infazı, etkilenen maç ve bağımsız oyuncu puanı kaynakla doğrulanmalıdır.
- Ağırlıklar açık model varsayımlarıdır; bilimsel sabitler değildir.
- Ceza ve VAR araştırması tamamlanmamıştır. Doğrulanmamış kayıtlar puanlanmaz; eksik veri sıfır etki anlamına gelmez. Kısmi toplamlar kesin sıralama olarak yorumlanmamalıdır.

## Mühendislik yaklaşımı

Ham kaynak snapshot'ları, normalize JSON, kaynak manifesti ve şema kontrolleri veri işleme sürecini izlenebilir kılar. Veri gezgini sezon ve takım filtreleriyle kayıtları incelemeyi sağlar; kaynak sayfası TFF maç detaylarına bağlantılar sunar. Aynı olayın iki kez puanlanması engellenir.

Katkı ve geri bildirim: info@orcuncandan.com

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

Olayların etkisi ham etki, güven katsayısı ve kategori ağırlığı üzerinden hesaplanır. Aynı `eventId` puanlamada bir kez işlenir. Veri yokluğu sıfır etki olarak varsayılmaz; bilinmeyen ölçümler ayrı tutulur. Güncel ağırlıklar, yön çarpanları ve eksik veri yaklaşımı uygulamadaki `/methodology` sayfasında açıklanır.


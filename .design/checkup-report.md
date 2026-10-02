# Ana sayfa okunurluk kontrolü

2026-10-02. Kapsam: ana sayfa, kaynak kodu ve CSS renk çiftleri. Tasarım dosyaları değiştirilmedi.

| ID | Önem | Alan | Kanıt | Sorun / risk | Önerilen düzeltme |
|---|---|---|---|---|---|
| R01 | Yüksek öncelikli doğrulama | Üst istatistikler | globals.css:42–43; matchday.css:23–24 | Eski nth-child kuralları yeni şeffaf zemin kuralından daha özgül. Yeni yazı renkleriyle pastel zeminlerin kontrastı 1,08–1,19:1; normal metin hedefi 4,5:1. Canlı computed style doğrulanamadı. | Eski pastel kuralları kaldır veya yeni temada aynı özgüllükte açıkça sıfırla. |
| R02 | Doğrulama gerekli | Hero etiketi | matchday.css:16,28 | hero-label ve eyebrow aynı özgüllükte; sonraki eyebrow kahverengi rengi geçerli olabilir. Koyu yeşil zeminle 2,14:1. Dosyalar arası yükleme sırası canlı kontrol gerektiriyor. | Hero etiketi için açık bağlam seçicisi ve turuncu renk kullan. |
| R03 | Orta | Sezon tablosu / etiketler | globals.css compact-season tablo 11px; matchday.css eyebrow 10px | Küçük metin boyutları yoğun tablo ve etiketlerde okuma yükünü artırıyor. Boyut tek başına WCAG ihlali değildir. | Tablo ve açıklamaları en az 12–13px, kısa etiketleri 11–12px yap; kompaktlığı boşlukla koru. |

## Yapılan kontroller

- CSS seçicilerinin özgüllüğü ve tanımlanan renkler incelendi.
- Kontrastlar WCAG bağıl parlaklık formülüyle hesaplandı; ölçüm canlı ekran renklerinden değil kaynak değerlerinden yapıldı.
- Uygulama içi tarayıcı bağlantısı odak başlatma aşamasında zaman aşımına uğradı.

## Eksik doğrulama

Gerçek rendered/computed renkler, 320px reflow, %200 zoom, grafik tooltip ve klavye odağı kontrol edilemedi. Ekran görüntüsü alınamadı. Ekran okuyucu testi yapılmadı.

Karar: **Görsel doğrulama bekliyor.** R01 ve R02 öncelikle çözülmeli / canlı ekranda teyit edilmeli. Genel erişilebilirlik onayı verilmedi.

## Uygulanan düzeltmeler

R01: Hero bağlamındaki istatistiklerin tüm zeminleri koyu yeşile sabitlendi; eski nth-child kurallarından daha özgül seçiciler kullanıldı. R02: Hero etiketi turuncuya sabitlendi. R03: Sezon tablosu 13px, kısa bölüm etiketleri 12px yapıldı. Formül açıklamaları 14px ve daha açık metin rengine taşındı. Veri ve hesaplama değişmedi. Tarayıcı doğrulaması tekrar denendi ancak bağlantı yine zaman aşımına uğradı; görsel onay hâlâ bekliyor.

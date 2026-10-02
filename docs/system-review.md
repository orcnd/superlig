# Sistem incelemesi — 2 Ekim 2026

Bu inceleme hesaplama kodunu, JSON girişini, ana sayfayı, takım sayfalarını ve veri gezginini kapsar. Canlı tarayıcıya erişim güvenlik politikası nedeniyle engellendi; görsel ve etkileşimli tarayıcı doğrulaması yapılamadı. Kod, testler ve üretilen sayfa çıktısı kontrol edildi.

## Düzeltilen sorunlar

- Küçük katkılar bir ondalıkta +0,0 görünüyordu. Ortak biçimleyici iki ondalık ve Türkçe sayı biçimi kullanıyor; çok küçük sıfır dışı değerleri sıfır gibi göstermiyor.
- Penaltı türüne ceza kategorisi gibi yanlış bir etki eklenirse motor bunu kabul edebiliyordu. Olay türü/kategori eşleşmesi ve ceza etkisinin yönü artık kontrol ediliyor.
- VAR ileride eklense bile sezon bileşenleri, pasta grafikleri ve takımın haftalık toplamı bunu göstermeyecekti. VAR kategorisi bu ayrımlara eklendi; henüz doğrulanmış VAR verisi yok.
- Hakem listesinin takım filtresi çalışmıyordu. Şimdi seçilen takımın maç kimlikleriyle filtreleniyor.
- “Kart kayıtları” bağlantısı boş başlığa açılıyordu. Kartlar sekmesine yönlendirildi. Rakip/kendi ceza bağlantıları da yalnızca ilgili etkileri gösteriyor.
- Veri gezgini ilk 200/300 kayıttan sonrasına erişim vermiyordu. Filtreleri koruyan sayfalama eklendi; filtre değişiminde sayfa sıfırlanıyor.
- Kesin sıra verilemediği halde sıra sütununda renkli boş madalyalar vardı. Kısmi sonuçlar puan özeti olarak sunuluyor; anlamsız boş sıra ve belirsizlik sütunları kaldırıldı.
- Tüm doğrulanmış kayıtlarda güven 1 olduğu için güven düğmesi sonuçları değiştirmiyordu. Artık yalnızca etkili olabilecekse gösteriliyor.
- Telefonda tüm menü gizleniyordu. Menü kaydırılabilir biçimde erişilebilir tutuluyor. Açılır düğmelere erişilebilirlik durumu eklendi.
- Formül eski/kısmi katsayı açıklamaları içeriyordu. Güncel çarpanları doğrudan yapılandırmadan okuyor ve sayfanın sonunda yer alıyor. Üstte rakamsız, sade bir kapsam açıklaması var.

## Hesabın korunan kuralları

Normal kartlar, maç kazanmak, goller, sakatlık, hakem gözlemci puanı ve kadro değeri puan getirmez. Ceza için önemli maçtaki gerçek ceza yokluğu ve kart öncesi oyuncu puanı doğrulanmalıdır. Rakip eksikliği tüm lig takımlarından gelebilir. Kart öncesi oyuncu puanı yerine sezon sonu ortalaması geriye uygulanmaz. Kaynaklı penaltı kararları gol/kaçırma sonucundan bağımsız puanlanır. Son değişiklikler mevcut katsayılar üzerinden uygulanmıştır: lehe penaltı 0,25; rakip eksikliği ve kart-ceza dezavantajı 1,95. Her biri kendi katkısına bir kez uygulanır.

## Devam eden sınırlar

- Ceza araştırması tamamlanmadı. İnceleme bekleyen kayıtlar sıfır etkili olaylar olarak yorumlanamaz. VAR kararları da henüz yok. Bu nedenle sonuç kesin sıralama değildir.
- Ceza/VAR kapsamının tamamlandığını gösteren kayıt sistemi henüz yok; motor tüm gerekli kategorileri kapsamı belirsiz sayıyor. Sadece dosyada olay bulunması o kategorinin tamamlandığı anlamına gelmez.
- Kaynak doğrulaması kararın gerçekleştiğini gösterir, yanlış ya da taraflı olduğunu değil. Doğru penaltı da bu ölçümde sahadaki etkisiyle yer alır.
- Katsayılar ve “önemli oyuncu” eşiği model tercihleridir. Topla oynama, ceza sahasına giriş veya bilimsel olarak ölçülen nedensel etkiye göre düzeltilmiş değildir.
- Eksik olayların etkisi bilinmediğinden istatistiksel güven aralığı verilmez. Mevcut duyarlılık hesabı kategori katsayılarını değiştirir; 1,95/0,25 gibi yön çarpanlarının ayrı duyarlılığını ölçmez.
- Maç sonuçları tablosu kayıtlı maçlardan hesaplanır; yaptırım/puan silme kararlarını içeren resmî lig tablosu değildir ve endeksi etkilemez.
- Grafiklerde puanlanan katkı yoksa gözlem/aday sayıları ayrı etiketle gösterilir; bunlar kesin avantaj puanı değildir.

Tam veri, bağımsız karar değerlendirmesi ve eksik kategori kapsamı olmadan “hakemler en çok hangi takımı kayırdı?” sonucuna varılamaz.

## Sonraki arayüz düzenlemesi

Kullanıcının isteğiyle boş VAR sütunları, inceleme bekleyen paneller, puanlanmayan maç satırları ve ham aday sayılarından oluşan yedek grafikler görünümden kaldırıldı. Araştırma JSON'ları silinmedi; doğrulanmış katkılar ve hesap ağırlıkları değiştirilmedi. Sezon özetleri yan yana, grafikler daha küçük kartlarda ve formül sayfanın sonunda açılır olarak gösteriliyor.

Bu düzenlemede mevcut çalışan tarayıcı sekmesine erişilebildi. Masaüstü ve 390 piksel telefon görünümü ekran görüntüleriyle kontrol edildi; grafikler, formül düğmesi ve takım detayına geçiş doğrulandı. Galatasaray sayfasında doğrulama bekleyen satır ve boş puan hücresi bulunmadığı kontrol edildi. Mobil genişlik geçici ayarı kontrol sonunda geri alındı.

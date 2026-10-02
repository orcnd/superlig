# İncelenmiş hakem kararları

`reviewed-decisions.json` kaynaklı kayıtların uygulamaya otomatik JSON girişidir.
Envanter kaynaklı kararlarla doldurulmuştur; boş kategori sıfır etki değildir.
TFF kart/gol/kadro dosyaları değiştirilmez. Adaylar günlüklerde puanlanmadan görünür.

## Penaltılar

`penalties` kaydı: `id`, `matchId`, `benefitingClubId`, `player`, `minute`,
`outcome` (`scored`, `missed`, `saved`), `sourceUrls` (verilen kararı doğrulayan URL'ler).
Sonuçtan bağımsız ham etki 1. İptal edilen penaltıyı verilmiş karar olarak eklemeyin.
Yalnızca gol listesini kullanmayın; kaçan/kurtarılan penaltıları da araştırın.

## Cezalar

`suspensions` kaydı: `id`, `originMatchId`, `affectedMatchIds`, `clubId`,
`playerId`, `player`, `cause` (`red`, `second_yellow`, `yellow_accumulation`),
`sourceUrls` (infaz edilen maçları doğrulayan ceza kaynağı).
Birden fazla maçlık cezada her gerçekten etkilenen maç açıkça belirtilir.
Kupa infazı, ceza iptali ve sarı birikimi sezon kuralları ayrıca incelenir.

`rating`: `value`, `min`, `max`, `valuableThreshold`, `assessedAt` (ISO UTC),
`sourceUrl`, `provider`. Bağımsız puan kaynağı kullanın; maç sonrası bilgiyle
geçmiş puanı değiştirmeyin. Tarih kart maçından önce olmalıdır. Eşik ve ölçek
aynı sağlayıcı/puan sistemi için tutarlı belirlenmeli, oyuncuya özel ayarlanmamalıdır.
Normalize etki `(value-min)/(max-min) × 2.25`.

İçeri aktarım şeması `src/data/reviewed-decisions.ts` içindedir. Geçersiz ölçek,
kaynak, maç, tarih veya kadroda bulunan cezalı oyuncu build'i durdurur.
Kaynakları yazmak doğrulamanın yerine geçmez; bağlantıdaki içerik elle incelenmelidir.
Kapsam denetimi tamamlanana kadar kesin takım sıralaması ve güven aralığı kapalıdır.

## İçe aktarma ve kaynak arşivleri

- `npm run data:import:penalties`: TFF gol olmuş penaltıları + üç sezonun
  Transfermarkt kaçan penaltı listeleri. Bütün lig takımları eşleştirilir.
  Maç kimliği, hafta, saha tarafı ve skor kontrol edilir; eşleşmeyen kayıtlar
  ham dosyada tutulur ve komut başarısız durum döndürür. İncelenmiş manuel
  kayıtlar (örneğin tatil edilen Morata penaltısı) yeniden içe aktarmada korunur.
- `npm run data:import:ratings`: ücretsiz FotMob sezon ve maç puanlarını toplar.
  Tarihsel maçların güncel sakat/eksik oyuncu alanları geçmiş olay kanıtı olarak
  kullanılmaz; bu alanlar sağlayıcıda güncel bilgilerle değişebilmektedir.
- `npm run data:import:discipline`: PFDK kararlarını kaynak, tarih, özet ve hash ile saklar.
- `npm run data:enrich:suspensions`: kart öncesi son beş puanlanan lig
  görünümünün ortalaması (en az üç görünüm), 7/10 ortak önem eşiği. Belirsiz
  oyuncu kimlikleri ve ceza infazları otomatik olarak doğrulanmış sayılmaz.
- `npm run data:manifest`: bütün kaynak dosyalarını ve sayılarını yeniden hashler.

`suspension-research.json` ceza araştırmasıdır, kesin infaz envanteri değildir.
`fotmob-player-ratings.json` sezon sonu ortalamaları araştırma referansıdır;
geçmişteki bir ceza haftasına uygulanmaz. İncelenmiş Fred kaydındaki 7,64,
kart öncesi maç puanlarından 7,4 / 7,0 / 8,0 / 8,1 / 7,7 ortalamasıdır.

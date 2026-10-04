<div align="center">

# Isaac Switch RU EID

**Русские описания предметов с тиром (качеством 0–4) для _The Binding of Isaac: Repentance_ на прошитой Nintendo Switch:
текст встроен прямо в текстуры предметов. В комплекте инструмент, который переносит прогресс из Repentance+ на ПК на консоль.**

[![Платформа](https://img.shields.io/badge/Nintendo%20Switch-Atmosph%C3%A8re%20LayeredFS-e60012?logo=nintendoswitch&logoColor=white)](docs/switch-notes.md)
[![Игра](https://img.shields.io/badge/Repentance-1.7.9b%20(US)-8b0000)](docs/switch-notes.md)
[![Node](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](package.json)
[![Лицензия](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[English](README.md) · **Русский**

<img src="assets/v3-final.jpg" width="820" alt="Русские описания под предметами в магазине на Switch Lite">

<sub>Настоящее фото Switch Lite: у каждого предмета в магазине своё название, тир и описание на русском.</sub>

</div>

---

## Зачем это нужно

Версия Repentance для Switch не умеет запускать Lua-моды, поэтому знаменитый **External Item Descriptions (EID)** там не работает.
Сообщество обошло это модом *EID for Switch*: он рисует описания прямо в картинке каждого предмета, но только на английском.
Кроме того, его текст стоит справа от предмета шириной 170 пикселей, и в магазине на экране Switch Lite описания налезают друг на друга.

Этот проект **заново рисует все текстуры** из русских описаний EID, его пиксельного шрифта и значков:

- **908 картинок** (719 предметов и 189 брелоков) с русским текстом из описаний EID для Repentance. Не Repentance+, потому что на консоли именно Repentance;
- **значок тира 0–4** рядом с названием, в английском моде его нет;
- текст **по центру под предметом** в масштабе 75%: каждый пиксель шрифта ложится ровно в 2×2 пикселя экрана 720p, поэтому текст чёткий;
- блоки достаточно узкие, чтобы **описания соседних предметов в магазине не налезали**, и начинаются ниже подставки и ценника;
- значок предмета в интерфейсе, анимация «предмет над головой» и **скрытые предметы «?»** работают как раньше.

А ещё здесь есть **конвертер сейвов** из Repentance+ (ПК) в Repentance (Switch) с пересчётом контрольной суммы.

## Как менялся мод

| v1: текст справа | v2: отдельный слой текста | v3: один слой, по центру |
|:---:|:---:|:---:|
| <img src="assets/v1-shop.jpg" width="270"> | <img src="assets/v2-bug.jpg" width="270"> | <img src="assets/v3-final.jpg" width="270"> |
| Длинные описания налезают на соседей и ценники | У всех предметов «Грустный лук»: игра подменяет картинку **для каждого слоя отдельно** | Текст в слое самого предмета, по центру и в масштабе 75% |

Подробно, со всеми решениями и причинами, написано в **[docs/how-it-works.md](docs/how-it-works.md)** (на английском).

## Быстрый старт

**Что нужно:**
- Switch с Atmosphere;
- *The Binding of Isaac: Afterbirth+* `010021C000B6A000` с обновлением 1.7.9b и DLC Repentance `010021C000B6B001` (американское издание);
- [Node.js](https://nodejs.org) версии 18 или новее.

Файлов игры и чужих ресурсов в репозитории нет. Сборщик берёт их из твоих копий.

1. **Скачай исходники:**
   - **EID**: папка мода из Steam Workshop (`…/The Binding of Isaac Rebirth/mods/external item descriptions_836319872`) или копия [EID с GitHub](https://github.com/wofsauge/External-Item-Descriptions);
   - **EID for Switch (English)** с [GameBanana](https://gamebanana.com/mods/692797), распакованный. Из него берутся картинки предметов и файлы `.anm2`;
   - *по желанию:* `items_metadata.xml` из [isaac-extended-icons-mod](https://codeberg.org/janAkali/isaac-extended-icons-mod/src/branch/master/utils/parsers/external), он нужен для значков тира.
2. **Настрой:** скопируй `config.example.json` в `config.json` и пропиши три пути.
3. **Собери:**
   ```bash
   npm run build
   ```
4. **Установи:** скопируй `dist/atmosphere` в корень карты памяти. Карту подключи через hekate (*Tools → USB Tools → SD Card*) или картридер. Через MTP в DBI файлы на карте не перезаписываются, подробнее в [заметках про Switch](docs/switch-notes.md).
5. По желанию **посмотри результат заранее**, без консоли:
   ```bash
   npm run preview -- --scene shop --out shop.png
   ```

<div align="center">
<img src="assets/scene-shop.png" width="640" alt="Симуляция экрана Switch Lite: магазин">
<br><sub>Симуляция экрана Switch Lite 1280×720. Заштрихованные прямоугольники — это ценники.</sub>
</div>

## Перенос прогресса с ПК на Switch

```bash
node bin/convert-save.js to-repentance rep+persistentgamedata1.dat rep_gamedata1.dat
```

Конвертер обрезает 4 достижения и 27 счётчиков, которых нет в обычном Repentance, сохраняет всё остальное и пересчитывает контрольную сумму.
Где лежат файлы, как положить результат на консоль и как вернуть прогресс обратно на ПК, написано в **[docs/save-transfer.md](docs/save-transfer.md)**.

## Как проверено

| Проверка | Результат |
|---|---|
| Движок текста против оригинальных английских картинок (`npm run calibrate`) | Предмет *D6*: **0 из 1346** пикселей отличаются; ширина переноса 165 px совпадает по высоте у **898 из 908** картинок |
| Новый код против сборки, установленной на консоль | **913 из 913** файлов совпадают байт в байт на одних и тех же данных |
| Контрольная сумма сейвов | Совпадает на **8 настоящих сейвах**: Afterbirth+, Repentance и Repentance+ с ПК, Repentance со Switch |
| Сконвертированный сейв на консоли | Записан через DBI и считан обратно **байт в байт** |
| Железо | Switch Lite, Atmosphere, emuMMC, Repentance 1.7.9b |

## Ограничения

- Текстура не знает, где стоит игрок. Описания видны всегда, длинные могут доходить до нижней стены, а текст покачивается вместе с предметом.
- Полнота перевода зависит от самого EID. Непереведённые описания показываются по-английски (в EID 5.23 таких 0).
- Пути сделаны под американское издание. Для других регионов нужны свои пути к картинкам.

## Благодарности

- **[External Item Descriptions](https://github.com/wofsauge/External-Item-Descriptions)** (Wofsauge и соавторы): описания, русский перевод, шрифт и значки;
- **[EID for Switch](https://gamebanana.com/mods/692797)** (Sporoid): идея встроить EID в текстуры Switch, картинки предметов и файлы anm2;
- **[isaac-extended-icons-mod](https://codeberg.org/janAkali/isaac-extended-icons-mod)** (janAkali): данные о качестве предметов для Switch;
- **[isaac-save-edit-script](https://github.com/jamesthejellyfish/isaac-save-edit-script)** (jamesthejellyfish, MIT): алгоритм контрольной суммы сейвов.

## Правовая информация

Неофициальный фанатский проект, не связан с Nicalis, Edmund McMillen и Nintendo.
В репозитории только собственный код и документация: **нет файлов игры, файлов EID и картинок предметов**.
Текстуры собираются у тебя на компьютере из твоих же копий. Используй только с играми, которые у тебя есть. Код под лицензией [MIT](LICENSE).

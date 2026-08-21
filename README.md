# Trajectry

Мобильная слэнгшот-игра на Canvas: один веб-код, позже тот же билд в WebView на Android и iOS через Capacitor.

**Поиграть:** [getoutof.github.io](https://getoutof.github.io/)

Пуш в `main` или `cursor/**` собирает `dist` и выкладывает на GitHub Pages. Репозиторий — user-site (`getoutof.github.io`), поэтому в **[Settings → Pages](https://github.com/getoutof/getoutof.github.io/settings/pages)** Source должен быть **GitHub Actions**, не «Deploy from a branch».

## Лицензия и монетизация

Исходники **не MIT и не open source**. Юридический текст — [LICENSE](LICENSE) (Trajectry Source License 1.0). Кратко, без силы договора:

- смотреть код и гонять у себя можно;
- выкладывать свою сборку в магазины, на сайт или с рекламой — нельзя;
- **Free** (с рекламой) и **Pro** (покупка, без этой рекламы) остаются только у правообладателя, `getoutof`;
- патч в репозиторий можно использовать в платной версии.

Сторонние пакеты из `package.json` — под своими лицензиями.

## Сейчас

```bash
npm install
npm run dev
```

Открой телефон в той же сети или Chrome DevTools → device toolbar. Управление: оттяни шар и отпусти. Пунктир — предсказанная траектория. Цель — все золотые маяки, не больше шести бросков.

## Потом: нативные оболочки

Игра не зависит от Xcode. Оболочки ставятся, когда понадобится магазин:

```bash
npm run cap:add:android   # Android Studio
npm run cap:add:ios       # Mac + Xcode, только на этом шаге
npm run cap:sync          # копирует dist в нативные проекты
```

`capacitor.config.ts` уже задаёт `appId` `com.getoutof.trajectry`, тёмный фон и `webDir: dist`. Нативная сторона — тонкий слой в `src/platform.ts` (вибро сейчас через `navigator.vibrate`, позже `@capacitor/haptics`).

## Почему WebView

- физика, уровни и ввод пишутся один раз;
- PWA / браузер работают сразу, без аккаунта разработчика;
- iOS и Android получают один и тот же `dist`.

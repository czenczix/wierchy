# Wierchy

PWA do zbierania szczytów polskich Tatr: kolekcja, check-in GPS, postęp i odznaki, działa offline.

## Uruchomienie

```bash
npm install
npm run dev      # serwer deweloperski z podglądem na żywo
npm run build    # wersja produkcyjna do folderu dist/
```

## Struktura

- `src/main.tsx` – punkt startowy, podpina Reacta i routing
- `src/App.tsx` – układ apki i lista ekranów (tras)
- `src/pages/` – ekrany: lista, mapa, karta szczytu, postęp
- `src/components/` – mniejsze kawałki UI używane na ekranach

## Publikacja

Każdy push do `main` uruchamia `.github/workflows/deploy.yml`, który buduje apkę i publikuje ją na
https://czenczix.github.io/wierchy/

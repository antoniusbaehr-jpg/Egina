# Egina

Gemeinsame Einkaufsliste, freie Notiz und Urlaubskasse für iPhone und Android, ohne Konto.

## Öffnen

Die App läuft unter https://egina-urlaub.brownslug16.chatgpt.site/ . Die GitHub-Pages-Oberfläche unter https://antoniusbaehr-jpg.github.io/Egina/ nutzt denselben Datenspeicher.

- Artikel hinzufügen, abhaken und löschen
- Gemeinsame Notiz mit automatischem Speichern und Konfliktvergleich
- Personen oder Haushalte anlegen
- Ausgaben auf ausgewählte Beteiligte gleichmäßig verteilen
- Centgenaue Abrechnung und Ausgleichsvorschläge
- Rückzahlungen verbuchen; fehlerhafte Einträge löschen und neu erfassen
- Synchronisierung alle zwei Sekunden, solange die App geöffnet ist

Alle mit dem Link können Daten lesen und ändern. Es gibt bewusst keine Konten und keine vertraulichen Bereiche. Internetverbindung erforderlich. Nicht gespeicherte Notizentwürfe bleiben lokal auf dem jeweiligen Gerät; die übrigen Daten liegen in einer gemeinsamen D1-Datenbank. Ausgaben und Personen werden nicht offline gespeichert.

## GitHub Pages einschalten

Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**. Anschließend den Workflow „Publish Egina“ unter Actions ausführen bzw. einen neuen Commit pushen.

`index.html` ist die buildfreie GitHub-Pages-Oberfläche. Sie entspricht `public/egina.html`. Der Workflow lädt ausschließlich `index.html` hoch, keine Backend-Dateien.

## Backend

Vinext / Cloudflare Workers mit D1. `app/api/sync/route.ts` enthält die öffentliche API, `db/schema.ts` und `drizzle/` die versionierte Datenbankstruktur. Der Hosting-Quellcode liegt zusätzlich im verbundenen Sites-Repository. GitHub Pages allein bietet keinen gemeinsamen Datenspeicher; dessen Backend wird separat über Sites bereitgestellt. Die konfigurierte API-URL ist öffentlich und kein Schlüssel. Es sind keine Geheimnisse im Repository nötig.

Abhängigkeiten: `npm run install:ci`; Build: `npm run build`; Tests: `node tests/check.mjs`. Node 22.13 oder neuer erforderlich. Das Testskript prüft Rundung, Ausgleich, Rückzahlungen, API-Validierung, idempotente Einträge und konkurrierende Änderungen mit einer isolierten lokalen SQLite-Datenbank.

## Bedienung

Unter Ausgaben zuerst die Reisegruppe anlegen, dann zahlende Person und Beteiligte auswählen. Jeder ausgewählte Eintrag zählt als ein gleicher Anteil. Für Familien kann ein gemeinsamer Haushaltsname verwendet werden. Ein positiver Saldo bedeutet „bekommt zurück“, ein negativer „zahlt noch“. Rückzahlungen ändern die Salden, nicht die Summe der Urlaubsausgaben.

iPhone: Safari → Teilen → Zum Home-Bildschirm. Android: Browsermenü → Zum Startbildschirm hinzufügen.

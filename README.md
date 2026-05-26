# Compass Web Viewer

Веб-приложение для просмотра `STL`-моделей с авторизацией, каталогом станций, 3D-просмотром и административной панелью.

## Стек

- `Vite + React + TypeScript`
- `Express.js`
- `PostgreSQL`
- `Docker Compose`

## Локальный запуск

1. Скопируйте пример переменных окружения:

```bash
cp .env.example .env
```

2. Запустите контейнеры:

```bash
docker compose up --build -d
```

3. Откройте приложение:

```text
http://localhost:8080
```

4. Остановите контейнеры:

```bash
docker compose down
```

5. Полностью удалите данные базы:

```bash
docker compose down -v
```

## Production на сервере

Используйте отдельный compose-файл:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Перед запуском создайте `.env` на сервере на основе `.env.example` и задайте свои значения:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`

Рекомендуемая схема:

- приложение доступно только на `127.0.0.1:8080`
- внешний трафик принимает `nginx`
- `nginx` проксирует `compass-web.ru` и `www.compass-web.ru` на `127.0.0.1:8080`
- HTTPS выпускает `certbot`

Пример `nginx`-конфига:

```nginx
server {
    listen 80;
    server_name compass-web.ru www.compass-web.ru;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

После выпуска сертификата:

```bash
sudo certbot --nginx -d compass-web.ru -d www.compass-web.ru
```

## Production без Docker PostgreSQL

Если сервер плохо тянет скачивание образа `postgres` или Docker Hub недоступен, можно использовать PostgreSQL, установленный на хосте.

1. Установите PostgreSQL на сервер:

```bash
sudo apt update
sudo apt install -y postgresql
sudo systemctl enable --now postgresql
```

2. Создайте базу и пользователя:

```bash
sudo -u postgres psql
```

```sql
CREATE USER compass_user WITH PASSWORD 'strong-password';
CREATE DATABASE compass_web OWNER compass_user;
\q
```

3. Создайте `.env` и укажите:

```env
DATABASE_URL=postgres://compass_user:strong-password@host.docker.internal:5432/compass_web
```

4. Запускайте только приложение:

```bash
docker compose -f docker-compose.hostdb.yml up --build -d
```

## Тестовые учетные записи

- `ogk078 / ogk / ogk078`
- `oyit023 / oyit / oyit023`

Формат входа: `логин / подразделение / пароль`.

## Что поднимается

- `app` - frontend и backend приложения
- `postgres` - база данных `PostgreSQL`

После запуска:

- приложение доступно на `http://localhost:8080`
- база данных доступна только внутри docker-сети

## Автозагрузка моделей

Если вы кладёте `.stl`-файлы в `public/models`, они автоматически попадают в каталог при старте приложения.

- папка первого уровня в `public/models` становится названием раздела
- все `.stl` внутри этой папки попадают в этот раздел
- `.stl`-файлы прямо в `public/models` попадают в раздел `Без раздела`

## Полезные команды

Логи приложения:

```bash
docker compose logs -f app
```

Логи базы данных:

```bash
docker compose logs -f postgres
```

Пересборка после изменений:

```bash
docker compose up --build -d
```

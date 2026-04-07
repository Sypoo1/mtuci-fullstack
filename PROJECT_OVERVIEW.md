# GitMetrics Analyser — Полное техническое описание проекта

> Документ описывает архитектуру, логику работы, технологии и все тонкости реализации проекта.
> Прочитав его, вы сможете полностью разобраться в коде без дополнительных вопросов.

---

## Содержание

1. [Общая идея проекта](#1-общая-идея-проекта)
2. [Структура репозитория](#2-структура-репозитория)
3. [Запуск проекта](#3-запуск-проекта)
4. [Бэкенд — FastAPI](#4-бэкенд--fastapi)
   - 4.1 [Точка входа и создание приложения](#41-точка-входа-и-создание-приложения)
   - 4.2 [Конфигурация (config.py)](#42-конфигурация-configpy)
   - 4.3 [База данных и ORM](#43-база-данных-и-orm)
   - 4.4 [Модели SQLAlchemy](#44-модели-sqlalchemy)
   - 4.5 [Миграции Alembic](#45-миграции-alembic)
   - 4.6 [Аутентификация и безопасность](#46-аутентификация-и-безопасность)
   - 4.7 [API роутеры](#47-api-роутеры)
   - 4.8 [CRUD-функции](#48-crud-функции)
   - 4.9 [GitHub парсер](#49-github-парсер)
   - 4.10 [AI-скоринг и отчёт](#410-ai-скоринг-и-отчёт)
   - 4.11 [Фоновая задача анализа](#411-фоновая-задача-анализа)
5. [Фронтенд — React + TypeScript](#5-фронтенд--react--typescript)
   - 5.1 [Структура фронтенда](#51-структура-фронтенда)
   - 5.2 [Роутинг и защита маршрутов](#52-роутинг-и-защита-маршрутов)
   - 5.3 [Контекст аутентификации](#53-контекст-аутентификации)
   - 5.4 [Axios клиент и интерцепторы](#54-axios-клиент-и-интерцепторы)
   - 5.5 [Страницы](#55-страницы)
6. [Полный жизненный цикл анализа](#6-полный-жизненный-цикл-анализа)
7. [Схема базы данных](#7-схема-базы-данных)
8. [Формула расчёта score](#8-формула-расчёта-score)
9. [Переменные окружения](#9-переменные-окружения)
10. [Известные тонкости и решённые проблемы](#10-известные-тонкости-и-решённые-проблемы)

---

## 1. Общая идея проекта

**GitMetrics Analyser** — веб-приложение для автоматической оценки эффективности команды разработчиков через анализ метрик GitHub-репозитория.

**Что делает система:**
1. Пользователь регистрируется/логинится
2. Добавляет GitHub-репозиторий (owner/name + опциональный токен)
3. Запускает анализ за выбранный период дат
4. Система в фоне:
   - Парсит GitHub API (коммиты, PR, code reviews)
   - Вычисляет score каждому разработчику (0–100)
   - Генерирует AI-отчёт через LLM (OpenRouter/OpenAI)
5. Пользователь видит таблицу метрик, графики и AI-отчёт с рекомендациями

---

## 2. Структура репозитория

```
mtuci-fullstack/
├── backend/
│   ├── pyproject.toml              # зависимости Python (uv)
│   ├── docker-compose.yaml         # PostgreSQL в Docker
│   └── fastapi-application/
│       ├── main.py                 # точка входа, CORS, монтирование роутеров
│       ├── create_fastapi_app.py   # фабрика FastAPI приложения
│       ├── .env                    # секреты (gitignored)
│       ├── .env.template           # шаблон с документацией
│       ├── alembic.ini             # конфиг Alembic
│       ├── alembic/
│       │   ├── env.py              # async Alembic runner
│       │   └── versions/           # файлы миграций
│       ├── api/
│       │   └── api_v1/
│       │       ├── __init__.py     # сборка всех роутеров в /v1
│       │       ├── auth.py         # /auth/register, /auth/login, /auth/me
│       │       ├── users.py        # CRUD пользователей (admin)
│       │       ├── repositories.py # CRUD репозиториев
│       │       └── analyses.py     # запуск/получение/удаление анализов
│       ├── core/
│       │   ├── config.py           # pydantic-settings конфигурация
│       │   ├── security.py         # bcrypt + JWT
│       │   ├── dependencies.py     # FastAPI dependency: CurrentUser
│       │   ├── ai_scorer.py        # формула score + LLM отчёт
│       │   ├── models/             # SQLAlchemy ORM модели
│       │   │   ├── user.py
│       │   │   ├── repository.py
│       │   │   ├── analysis.py     # Analysis + ContributorMetrics
│       │   │   ├── db_helper.py    # DatabaseHelper (engine + session)
│       │   │   └── base.py         # DeclarativeBase с naming_convention
│       │   ├── schemas/            # Pydantic схемы (request/response)
│       │   │   ├── user.py
│       │   │   ├── repository.py
│       │   │   └── analysis.py
│       │   └── github_parser/
│       │       └── parser.py       # PyGitHub парсер метрик
│       └── crud/                   # async CRUD функции
│           ├── users.py
│           ├── repositories.py
│           └── analyses.py
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx                 # роутинг
        ├── main.tsx                # точка входа React
        ├── api/
        │   └── client.ts           # Axios instance + интерцепторы
        ├── context/
        │   └── AuthContext.tsx     # глобальный стейт авторизации
        ├── components/
        │   ├── Navbar.tsx
        │   └── ProtectedRoute.tsx  # редирект на /login если нет токена
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── DashboardPage.tsx   # список репозиториев + последние анализы
        │   ├── NewRepositoryPage.tsx
        │   ├── RepositoryPage.tsx  # детали репо + запуск анализа
        │   └── AnalysisPage.tsx    # результат анализа + графики + AI-отчёт
        ├── styles/
        │   └── common.ts           # inline-стили (CSS-in-JS объекты)
        └── types/
            └── index.ts            # TypeScript интерфейсы
```

---

## 3. Запуск проекта

### Требования
- Python 3.12+ с менеджером `uv`
- Node.js 18+
- Docker (для PostgreSQL)

### Шаги

```bash
# 1. Запустить PostgreSQL
cd backend && docker compose up -d

# 2. Применить миграции
cd backend/fastapi-application && uv run alembic upgrade head

# 3. Запустить бэкенд
cd backend/fastapi-application && uv run main.py
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)

# 4. Запустить фронтенд (в другом терминале)
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

### Конфигурация `.env`
Файл должен лежать в `backend/fastapi-application/.env` (не в `backend/.env`!).
Pydantic-settings читает его при старте приложения — изменения требуют перезапуска сервера.

---

## 4. Бэкенд — FastAPI

### 4.1 Точка входа и создание приложения

**`main.py`** — главный файл:
- Создаёт FastAPI приложение через фабрику `create_app()`
- Добавляет CORS middleware (разрешает `http://localhost:5173`)
- Монтирует все API роутеры через `api_router`
- Монтирует `/static` для favicon и Swagger иконки
- При запуске через `python main.py` — стартует uvicorn с `reload=True`

**`create_fastapi_app.py`** — фабрика:
- `lifespan` контекстный менеджер: при shutdown вызывает `db_helper.dispose()` (закрывает пул соединений)
- Регистрирует кастомные URL для Swagger UI и ReDoc (загружают JS/CSS с unpkg.com, а не из встроенных файлов FastAPI)

**Маршрутизация API:**
```
/api/v1/auth/...          ← auth роутер
/api/v1/users/...         ← users роутер
/api/v1/repositories/...  ← repositories роутер
/api/v1/analyses/...      ← analyses роутер (top-level)
/api/v1/repositories/{id}/analyses/... ← analyses роутер (nested)
```

### 4.2 Конфигурация (config.py)

Используется **pydantic-settings** с вложенными моделями. Переменные окружения читаются с префиксом `APP_CONFIG__` и разделителем `__`:

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.template", ".env"),  # .env переопределяет .env.template
        env_nested_delimiter="__",
        env_prefix="APP_CONFIG__",
    )
    run: RunConfig       # APP_CONFIG__RUN__HOST, APP_CONFIG__RUN__PORT
    db: DatabaseConfig   # APP_CONFIG__DB__URL, APP_CONFIG__DB__ECHO
    auth: AuthConfig     # APP_CONFIG__AUTH__SECRET_KEY, ...
    openai: OpenAIConfig # APP_CONFIG__OPENAI__API_KEY, APP_CONFIG__OPENAI__BASE_URL, ...
```

**Важно:** `settings = Settings()` создаётся **один раз при импорте модуля**. Изменение `.env` файла требует перезапуска сервера — hot-reload Uvicorn перезагружает Python-модули, но только если изменился `.py` файл, не `.env`.

**OpenAIConfig** поддерживает два провайдера:
- **OpenAI**: `BASE_URL` пустой, `MODEL=gpt-4o-mini`
- **OpenRouter**: `BASE_URL=https://openrouter.ai/api/v1`, `MODEL=qwen/qwen3.6-plus:free`

### 4.3 База данных и ORM

**Технологии:** SQLAlchemy 2.x (async) + asyncpg драйвер + PostgreSQL

**`DatabaseHelper`** (`db_helper.py`):
- Создаёт `AsyncEngine` с пулом соединений (`pool_size=50`, `max_overflow=10`)
- Создаёт `async_sessionmaker` с `expire_on_commit=False` (объекты не инвалидируются после commit)
- `session_getter()` — async generator для FastAPI Depends: открывает сессию, yield, закрывает
- `session_factory()` — для фоновых задач (не через Depends)

**Паттерн использования сессии в роутерах:**
```python
session: Annotated[AsyncSession, Depends(db_helper.session_getter)]
```

**Паттерн в фоновых задачах:**
```python
async with _db_helper.session_factory() as session:
    # работа с БД
```

### 4.4 Модели SQLAlchemy

Все модели наследуют `IntIdPkMixin` (автоинкрементный `id: Mapped[int]`) и `Base` (DeclarativeBase с naming_convention для индексов/FK).

#### User
```python
class User(IntIdPkMixin, Base):
    __tablename__ = "users"
    name: Mapped[str]
    email: Mapped[str]          # уникальный
    hashed_password: Mapped[str]
    is_active: Mapped[bool] = mapped_column(default=True)
```

#### Repository
```python
class Repository(IntIdPkMixin, Base):
    __tablename__ = "repositories"
    owner: Mapped[str]           # GitHub owner (логин или организация)
    name: Mapped[str]            # название репозитория
    github_token: Mapped[str]    # Personal Access Token (хранится в открытом виде)
    user_id: Mapped[int]         # FK → users.id (CASCADE DELETE)
    analyses: relationship(...)  # один-ко-многим
```

#### Analysis
```python
class Analysis(IntIdPkMixin, Base):
    __tablename__ = "analyses"
    repository_id: Mapped[int]   # FK → repositories.id (CASCADE DELETE)
    start_date: Mapped[str]      # "YYYY-MM-DD"
    end_date: Mapped[str]
    status: Mapped[str]          # "pending" | "running" | "completed" | "failed"
    ai_report: Mapped[str|None]  # Text, заполняется после завершения
    created_at: Mapped[datetime] # server_default=func.now()
    contributors: relationship(...)  # один-ко-многим → ContributorMetrics
```

#### ContributorMetrics
```python
class ContributorMetrics(IntIdPkMixin, Base):
    __tablename__ = "contributor_metrics"
    analysis_id: Mapped[int]     # FK → analyses.id (CASCADE DELETE)
    github_login: Mapped[str]
    avatar_url: Mapped[str]
    commits_count: Mapped[int]
    additions: Mapped[int]       # добавленные строки
    deletions: Mapped[int]       # удалённые строки
    prs_opened: Mapped[int]
    prs_merged: Mapped[int]
    reviews_given: Mapped[int]   # уникальные PR, где оставлен review comment
    score: Mapped[float]         # 0.0–100.0
```

**Каскадное удаление:** User → Repository → Analysis → ContributorMetrics. Удаление пользователя удаляет всё.

### 4.5 Миграции Alembic

Конфиг: `backend/fastapi-application/alembic.ini`
Env: `backend/fastapi-application/alembic/env.py` — async runner через `asyncio.run()`

**Применение миграций:**
```bash
cd backend/fastapi-application
uv run alembic upgrade head
```

**Создание новой миграции:**
```bash
uv run alembic revision --autogenerate -m "описание"
```

Актуальная миграция: `2026_04_06_1724-e02e4b4f8e1e_full_schema_v2.py` — создаёт все 4 таблицы.

### 4.6 Аутентификация и безопасность

**`security.py`** содержит три функции:

```python
# Хэширование пароля (bcrypt, соль генерируется автоматически)
def hash_password(plain: str) -> str

# Проверка пароля
def verify_password(plain: str, hashed: str) -> bool

# Создание JWT токена
def create_access_token(subject: int | str) -> str
# payload: {"sub": "42", "exp": <timestamp>}
# алгоритм: HS256, секрет из settings.auth.secret_key

# Декодирование JWT (возвращает sub или None при ошибке)
def decode_access_token(token: str) -> str | None
```

**Почему bcrypt напрямую, а не passlib:**
passlib несовместим с bcrypt >= 4.x (изменился внутренний API). Используем `import bcrypt` напрямую.

**`dependencies.py`** — FastAPI dependency `CurrentUser`:
```python
CurrentUser = Annotated[User, Depends(get_current_user)]
```
`get_current_user`:
1. Извлекает токен из заголовка `Authorization: Bearer <token>` через `OAuth2PasswordBearer`
2. Декодирует JWT → получает `user_id`
3. Загружает пользователя из БД
4. Проверяет `user.is_active`
5. Возвращает объект `User` или бросает `401 Unauthorized`

**Эндпоинты аутентификации:**

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/v1/auth/register` | Регистрация. Body: `{name, email, password}`. Проверяет уникальность email. |
| POST | `/api/v1/auth/login` | Логин. Form data: `username` (email), `password`. Возвращает `{access_token, token_type}`. |
| GET | `/api/v1/auth/me` | Профиль текущего пользователя. Требует Bearer токен. |

**Важно:** `/login` принимает `OAuth2PasswordRequestForm` (form-data, не JSON). Фронтенд отправляет `application/x-www-form-urlencoded` с полями `username` и `password`.

### 4.7 API роутеры

#### Repositories (`/api/v1/repositories`)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/repositories` | Список репозиториев текущего пользователя |
| POST | `/repositories` | Создать репозиторий. Body: `{owner, name, github_token?}` |
| GET | `/repositories/{id}` | Детали репозитория (проверка владельца) |
| DELETE | `/repositories/{id}` | Удалить репозиторий (каскадно удаляет анализы) |

Все эндпоинты требуют `CurrentUser`. Проверка владельца: `repo.user_id != current_user.id` → 404.

#### Analyses

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/analyses` | Все анализы по всем репозиториям пользователя |
| GET | `/repositories/{id}/analyses` | Анализы конкретного репозитория |
| POST | `/repositories/{id}/analyses` | Запустить анализ. Body: `{start_date, end_date}` |
| GET | `/analyses/{id}` | Результат анализа (с contributors и ai_report) |
| DELETE | `/analyses/{id}` | Удалить анализ |

**Схемы ответов:**
- `AnalysisRead` — базовая (без contributors): используется в списках
- `AnalysisResultRead` — полная (с contributors + ai_report): используется в GET `/analyses/{id}`

### 4.8 CRUD-функции

Все функции в `crud/` — async, принимают `AsyncSession`.

**`crud/analyses.py`:**
- `get_analyses_by_repo(session, repo_id)` — список анализов репо, сортировка по id desc
- `get_all_analyses_for_user_repos(session, repo_ids)` — анализы по списку repo_ids
- `get_analysis_by_id(session, id)` — с `selectinload(Analysis.contributors)` (eager loading, избегает N+1)
- `create_analysis(session, repo_id, data)` — создаёт со статусом "pending"
- `update_analysis_status(session, analysis, status, ai_report?)` — обновляет статус и опционально ai_report
- `save_contributor_metrics(session, analysis_id, contributors_data)` — bulk insert метрик
- `delete_analysis(session, analysis)` — удаляет (каскадно удаляет ContributorMetrics)

**Важно про `selectinload`:** При загрузке анализа по id используется `selectinload(Analysis.contributors)` — это делает отдельный SELECT для contributors, но в одном запросе (не N+1). Без этого обращение к `analysis.contributors` в async контексте вызвало бы `MissingGreenlet` ошибку.

### 4.9 GitHub парсер

**Файл:** `core/github_parser/parser.py`
**Библиотека:** PyGitHub (`github` пакет)

**Публичный API:**
```python
def parse_repository(
    owner: str,
    name: str,
    since: datetime,    # UTC-aware
    until: datetime,    # UTC-aware, время 23:59:59
    github_token: str | None = None,
    max_prs: int = 30,
    timeout: int = 30,
) -> RepoParseResult
```

**Стратегия сбора данных (оптимизированная):**

Вместо N+1 запросов используются bulk API:

1. **Коммиты/строки** — `repo.get_stats_contributors()`:
   - **ОДИН** API вызов
   - Возвращает недельные бакеты (Unix timestamp) для каждого контрибьютора
   - Фильтруем бакеты, попадающие в `[since, until]`
   - Суммируем `week.c` (commits), `week.a` (additions), `week.d` (deletions)
   - **Нюанс:** GitHub может вернуть `None` (статус 202 — "вычисляется"). Делаем до 3 попыток с паузой 2/4/6 секунд

2. **PR статистика** — `repo.get_pulls(state="all", sort="created", direction="desc")`:
   - Пагинированный проход, сортировка newest-first
   - Останавливаемся когда `pr.created_at < since` (оптимизация — не читаем всю историю)
   - Считаем `prs_opened` и `prs_merged` (если `pr.merged == True`)
   - Ограничение `max_prs=30` — защита от огромных репозиториев

3. **Code reviews** — `repo.get_pulls_review_comments(since=since)`:
   - **ОДИН** bulk API вызов вместо `pr.get_reviews()` на каждый PR
   - Дедупликация по `(reviewer_login, pr_number)` — один reviewer на один PR = 1 review
   - Останавливаемся когда `comment.created_at > until`

**Итоговый бюджет API вызовов:**
```
1 вызов  — get_repo()
1 вызов  — get_stats_contributors()
O(max_prs/100) — get_pulls() пагинация
1+ вызов — get_pulls_review_comments()
Итого: ~4-6 вызовов (vs. O(commits) + O(prs) раньше)
```

**Без токена:** GitHub даёт 60 запросов/час (анонимно). С токеном — 5000/час.

**Возвращаемый тип `RepoParseResult`:**
```python
@dataclass
class RepoParseResult:
    owner, name, full_name, description, stars, forks, language, open_issues
    contributors: list[ContributorData]  # отсортированы по commits_count desc
```

### 4.10 AI-скоринг и отчёт

**Файл:** `core/ai_scorer.py`

#### Вычисление score (`compute_scores`)

Принимает список raw contributor dict'ов, возвращает `list[ScoredContributor]`.

**Алгоритм:**
1. Извлекаем 4 метрики для всех участников: commits, additions, prs_merged, reviews
2. Нормализуем каждую метрику min-max по команде:
   ```python
   normalized = (value - min) / (max - min)
   # Если все одинаковые (max == min) → все получают 1.0
   ```
3. Взвешенная сумма:
   ```
   score = (0.35 × commits_norm
          + 0.20 × additions_norm
          + 0.20 × prs_merged_norm
          + 0.25 × reviews_norm) × 100
   ```
4. Округление до 1 знака после запятой

**Что НЕ учитывается в score:** `prs_opened`, `deletions` — только merged PR и reviews влияют на оценку.

**Интерпретация:** Score — **относительная** оценка внутри команды. Лучший участник по взвешенной сумме получает ~100, худший — ~0. Если в команде 1 человек — он получает 100.

#### Генерация AI-отчёта (`generate_ai_report`)

```python
async def generate_ai_report(scored, start_date, end_date) -> str
```

**Логика:**
1. Если `settings.openai.api_key` пустой → возвращает локальный plain-text отчёт (`_local_report`)
2. Иначе → вызывает LLM через OpenAI-совместимый API

**Построение клиента:**
```python
client_kwargs = {"api_key": settings.openai.api_key}
if settings.openai.base_url:
    client_kwargs["base_url"] = settings.openai.base_url
client = AsyncOpenAI(**client_kwargs)
```
Если `base_url` пустой — используется OpenAI по умолчанию. Если задан — любой совместимый провайдер (OpenRouter, Azure, etc.).

**Промпт (на русском):**
- Роль: аналитик эффективности команды
- Задача: 3-5 абзацев с выводами и рекомендациями
- Данные: топ-20 участников по score с метриками
- Просит указать: общую оценку, лидеров, отстающих, рекомендации

**Параметры запроса:** `max_tokens=800`, `temperature=0.7`

**Fallback:** При любой ошибке LLM → возвращает локальный отчёт (не падает).

**Локальный отчёт** (`_local_report`): plain-text без LLM, содержит период, статистику, топ участников, лидера, список отстающих (score < 40).

### 4.11 Фоновая задача анализа

**Функция:** `_run_analysis()` в `api/api_v1/analyses.py`

**Запуск:** через FastAPI `BackgroundTasks` — выполняется после отправки HTTP ответа клиенту.

**Полный поток:**
```
POST /repositories/{id}/analyses
  → создаёт Analysis(status="pending") в БД
  → возвращает 201 с объектом анализа
  → [в фоне] _run_analysis() запускается

_run_analysis():
  1. Открывает новую DB сессию (session_factory, не через Depends)
  2. Устанавливает status="running"
  3. Парсит GitHub (блокирующий вызов в executor):
     asyncio.wait_for(
         loop.run_in_executor(None, lambda: parse_repository(...)),
         timeout=300  # 5 минут
     )
  4. Если timeout → status="failed"
  5. Вычисляет scores (compute_scores)
  6. Генерирует AI отчёт (generate_ai_report) — async
  7. Сохраняет ContributorMetrics в БД
  8. Устанавливает status="completed", сохраняет ai_report
  9. При любом Exception → status="failed"
```

**Почему `run_in_executor`:** PyGitHub — синхронная библиотека. Вызов в async контексте заблокировал бы event loop. `run_in_executor(None, ...)` запускает в thread pool executor, не блокируя async.

**Почему отдельная сессия:** FastAPI Depends сессия закрывается после ответа. Фоновая задача работает после этого, поэтому открывает свою сессию через `session_factory()`.

---

## 5. Фронтенд — React + TypeScript

**Технологии:** React 18, TypeScript, Vite, React Router v6, Axios, Recharts, react-markdown

### 5.1 Структура фронтенда

```
src/
├── App.tsx                  # корневой компонент, роутинг
├── main.tsx                 # точка входа React
├── api/client.ts            # Axios instance
├── context/AuthContext.tsx  # глобальный стейт авторизации
├── components/
│   ├── Navbar.tsx           # шапка с кнопкой выхода
│   └── ProtectedRoute.tsx   # редирект на /login если нет токена
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── NewRepositoryPage.tsx
│   ├── RepositoryPage.tsx
│   └── AnalysisPage.tsx
├── styles/common.ts         # переиспользуемые inline-стили
└── types/index.ts           # TypeScript интерфейсы
```

### 5.2 Роутинг и защита маршрутов

**`App.tsx`** — React Router v6:
```
/login            → LoginPage         (публичный)
/register         → RegisterPage      (публичный)
/dashboard        → DashboardPage     (защищённый)
/repositories/new → NewRepositoryPage (защищённый)
/repositories/:id → RepositoryPage   (защищённый)
/analyses/:id     → AnalysisPage      (защищённый)
*                 → redirect /dashboard
```

**`ProtectedRoute.tsx`:**
```tsx
const { token } = useAuth();
if (!token) return <Navigate to="/login" replace />;
return <Outlet />;
```
Проверяет наличие токена в контексте. Если нет — редирект на `/login`. Все защищённые маршруты вложены в `<Route element={<ProtectedRoute />}>`.

### 5.3 Контекст аутентификации

**`AuthContext.tsx`** — глобальный стейт через React Context:

**Состояние:**
- `token: string | null` — JWT токен (инициализируется из `localStorage`)
- `user: User | null` — профиль пользователя

**Восстановление сессии при перезагрузке страницы:**
```tsx
useEffect(() => {
  const savedToken = localStorage.getItem("token");
  if (savedToken && !user) {
    api.get("/api/v1/auth/me")
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");  // токен протух
        setToken(null);
      });
  }
}, []);
```
Без этого `user` был бы `null` после F5, хотя токен есть в localStorage.

**Функции:**
- `login(token, user)` — сохраняет в localStorage и стейт
- `logout()` — очищает localStorage и стейт

### 5.4 Axios клиент и интерцепторы

**`api/client.ts`:**

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});
```

**Request interceptor** — добавляет JWT к каждому запросу:
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Response interceptor** — обрабатывает 401:
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isAuthEndpoint =
      url.includes("/auth/login") || url.includes("/auth/register");
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

**Критически важная деталь:** Без проверки `isAuthEndpoint` — при неверном пароле на `/login` бэкенд возвращает 401, интерцептор делал `window.location.href = "/login"`, страница перезагружалась, сообщение об ошибке исчезало мгновенно. Теперь для auth-эндпоинтов редирект пропускается.

### 5.5 Страницы

#### LoginPage / RegisterPage
- `loading` стейт — блокирует повторную отправку формы
- Кнопка показывает "Вход..." / "Регистрация..." во время запроса
- Ошибки отображаются в красном блоке под формой
- После успешного логина: `login(token, user)` → `navigate("/dashboard")`

#### DashboardPage
- При монтировании: параллельно загружает репозитории (`GET /repositories`) и анализы (`GET /analyses`)
- Отображает карточки репозиториев + таблицу последних анализов
- Кнопка 🗑 на каждом репозитории — удаляет репо + убирает его анализы из локального стейта
- Кнопка 🗑 на каждом анализе — удаляет только анализ

#### NewRepositoryPage
- Форма: owner, name, github_token (опционально)
- `POST /repositories` → redirect на `/repositories/{id}`

#### RepositoryPage (`/repositories/:id`)
- Загружает репозиторий и его анализы
- Форма запуска анализа: выбор `start_date` и `end_date`
- `POST /repositories/{id}/analyses` → redirect на `/analyses/{new_id}`
- Таблица анализов с кнопками "Открыть" и 🗑

#### AnalysisPage (`/analyses/:id`)
- **Polling:** `setInterval` каждые 5 секунд пока `status === "pending" | "running"`
- Останавливает polling при `status === "completed" | "failed"` или при ошибке загрузки
- **Состояния отображения:**
  - `pending/running` → спиннер "Анализ выполняется..."
  - `failed` → сообщение об ошибке + ссылки назад
  - `completed` → полный результат
- **Результат содержит:**
  - 4 карточки сводной статистики (коммиты, PR, reviews, участники)
  - Таблица участников (отсортирована по score desc) с аватарами
  - 4 графика Recharts (коммиты, PR opened/merged, reviews, score)
  - AI-отчёт с markdown рендерингом через `react-markdown`

**Цвета score** (`scoreColor` из `styles/common.ts`):
- ≥ 70 → зелёный `#16a34a`
- ≥ 40 → оранжевый `#ca8a04`
- < 40 → красный `#dc2626`

---

## 6. Полный жизненный цикл анализа

```
Пользователь нажимает "Запустить анализ"
         │
         ▼
POST /repositories/{id}/analyses
  {start_date: "2026-01-01", end_date: "2026-04-06"}
         │
         ▼
Бэкенд: создаёт Analysis(status="pending") → возвращает 201
         │
         ▼
Фронтенд: redirect на /analyses/{new_id}
         │
         ▼
AnalysisPage: polling каждые 5 сек → GET /analyses/{id}
         │
         ▼ (в фоне на сервере)
_run_analysis():
  status = "running"
         │
         ▼
  parse_repository() [в thread executor, timeout 5 мин]
    ├── get_stats_contributors() → коммиты/строки
    ├── get_pulls() → PR статистика
    └── get_pulls_review_comments() → reviews
         │
         ▼
  compute_scores() → score 0-100 для каждого
         │
         ▼
  generate_ai_report() → LLM запрос (или локальный отчёт)
         │
         ▼
  save_contributor_metrics() → INSERT в contributor_metrics
         │
         ▼
  status = "completed", ai_report сохранён
         │
         ▼
Фронтенд: polling получает status="completed"
  → останавливает polling
  → отображает таблицу + графики + AI-отчёт
```

---

## 7. Схема базы данных

```
users
├── id (PK, autoincrement)
├── name
├── email (UNIQUE)
├── hashed_password
└── is_active (default: true)

repositories
├── id (PK)
├── owner
├── name
├── github_token
├── created_at (server_default: now())
└── user_id (FK → users.id, CASCADE DELETE)

analyses
├── id (PK)
├── repository_id (FK → repositories.id, CASCADE DELETE)
├── start_date (TEXT "YYYY-MM-DD")
├── end_date (TEXT "YYYY-MM-DD")
├── status (TEXT: pending|running|completed|failed)
├── ai_report (TEXT, nullable)
└── created_at (server_default: now())

contributor_metrics
├── id (PK)
├── analysis_id (FK → analyses.id, CASCADE DELETE)
├── github_login
├── avatar_url
├── commits_count
├── additions
├── deletions
├── prs_opened
├── prs_merged
├── reviews_given
└── score (FLOAT)
```

**Каскады удаления:** User → Repository → Analysis → ContributorMetrics

---

## 8. Формула расчёта score

```
Для каждого участника:

1. Нормализация min-max по команде:
   commits_norm    = (commits - min_commits) / (max_commits - min_commits)
   additions_norm  = (additions - min_add) / (max_add - min_add)
   prs_merged_norm = (prs_merged - min_pr) / (max_pr - min_pr)
   reviews_norm    = (reviews - min_rev) / (max_rev - min_rev)

   Если max == min (все одинаковые) → norm = 1.0 для всех

2. Взвешенная сумма:
   raw = 0.35 × commits_norm
       + 0.20 × additions_norm
       + 0.20 × prs_merged_norm
       + 0.25 × reviews_norm

3. Масштабирование:
   score = round(raw × 100, 1)  → диапазон 0.0 – 100.0
```

| Метрика | Вес | Обоснование |
|---------|-----|-------------|
| Коммиты | 35% | Основная активность разработчика |
| Добавленные строки | 20% | Объём написанного кода |
| Смёрдженные PR | 20% | Завершённые задачи |
| Code reviews | 25% | Вклад в качество команды |

**Что НЕ учитывается:** `prs_opened` (только merged), `deletions`.

---

## 9. Переменные окружения

Файл: `backend/fastapi-application/.env`

```bash
# Сервер
APP_CONFIG__RUN__HOST=127.0.0.1

# База данных
APP_CONFIG__DB__URL=postgresql+asyncpg://user:pass@localhost:5432/gitmetrics
APP_CONFIG__DB__ECHO=0          # 1 = логировать SQL запросы

# JWT
APP_CONFIG__AUTH__SECRET_KEY=<длинная случайная строка>
APP_CONFIG__AUTH__ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 часа

# LLM — OpenRouter (бесплатный вариант)
APP_CONFIG__OPENAI__API_KEY=sk-or-v1-...
APP_CONFIG__OPENAI__BASE_URL=https://openrouter.ai/api/v1
APP_CONFIG__OPENAI__MODEL=qwen/qwen3.6-plus:free

# LLM — OpenAI (платный)
# APP_CONFIG__OPENAI__API_KEY=sk-...
# APP_CONFIG__OPENAI__BASE_URL=          ← пустой = OpenAI по умолчанию
# APP_CONFIG__OPENAI__MODEL=gpt-4o-mini
```

**Если `API_KEY` пустой** — система работает без LLM, генерирует локальный plain-text отчёт.

---

## 10. Известные тонкости и решённые проблемы

### 10.1 bcrypt vs passlib
**Проблема:** passlib не совместим с bcrypt >= 4.x (изменился внутренний API `__about__`).
**Решение:** Используем `import bcrypt` напрямую в `security.py`, passlib удалён из зависимостей.

### 10.2 Axios 401 на странице логина
**Проблема:** При неверном пароле бэкенд возвращает 401. Response interceptor делал `window.location.href = "/login"` — страница перезагружалась, сообщение об ошибке исчезало мгновенно.
**Решение:** Проверяем URL запроса — для `/auth/login` и `/auth/register` редирект пропускается.

### 10.3 Потеря user при перезагрузке страницы
**Проблема:** `user` стейт в AuthContext инициализировался как `null`. После F5 токен есть в localStorage, но `user === null`.
**Решение:** `useEffect` в AuthProvider при монтировании вызывает `GET /auth/me` если есть сохранённый токен.

### 10.4 N+1 запросы к GitHub API
**Проблема:** Старый парсер делал `commit.stats` для каждого коммита (N вызовов) и `pr.get_reviews()` для каждого PR (M вызовов).
**Решение:** `get_stats_contributors()` — ONE call для всех коммитов/строк; `get_pulls_review_comments(since=since)` — ONE bulk call для всех reviews.

### 10.5 PyGitHub `per_page` не поддерживается
**Проблема:** `repo.get_pulls(per_page=100)` бросал `TypeError`.
**Решение:** Убрали `per_page` аргумент — PyGitHub управляет пагинацией автоматически.

### 10.6 GitHub Statistics API возвращает None (202)
**Проблема:** `get_stats_contributors()` возвращает `None` если GitHub ещё вычисляет статистику.
**Решение:** Retry до 3 раз с паузой 2/4/6 секунд. Если всё равно None — возвращаем пустой результат.

### 10.7 Блокирующий GitHub API в async контексте
**Проблема:** PyGitHub синхронный — прямой вызов заблокировал бы asyncio event loop.
**Решение:** `loop.run_in_executor(None, lambda: parse_repository(...))` — запуск в thread pool.

### 10.8 Фоновая задача после закрытия DB сессии
**Проблема:** FastAPI Depends сессия закрывается после отправки HTTP ответа. Фоновая задача стартует после этого.
**Решение:** `_run_analysis()` открывает свою сессию через `_db_helper.session_factory()`.

### 10.9 .env файл в неправильном месте
**Проблема:** Pydantic-settings читает `.env` относительно рабочей директории при запуске. Если запускать из `backend/fastapi-application/`, файл должен быть там же.
**Решение:** Файл должен лежать в `backend/fastapi-application/.env`, не в `backend/.env`.

### 10.10 Модель OpenRouter с суффиксом :free
**Проблема:** `meta-llama/llama-3.1-8b-instruct:free` — модель была удалена с OpenRouter. Без суффикса `:free` — требует кредиты (402 ошибка).
**Решение:** Используем `qwen/qwen3.6-plus:free` — актуальная бесплатная модель (апрель 2026).

### 10.11 Markdown в AI-отчёте
**Проблема:** LLM возвращает markdown (`**bold**`, `# заголовки`), но `whiteSpace: "pre-wrap"` рендерил его как plain text.
**Решение:** Установили `react-markdown`, заменили `{analysis.ai_report}` на `<ReactMarkdown>{analysis.ai_report}</ReactMarkdown>`.

### 10.12 selectinload для contributors
**Проблема:** В async SQLAlchemy нельзя лениво загружать связанные объекты — `analysis.contributors` вызвал бы `MissingGreenlet` ошибку.
**Решение:** `selectinload(Analysis.contributors)` в `get_analysis_by_id()` — eager loading через отдельный SELECT.

---

## Быстрая шпаргалка по API

```
# Auth
POST /api/v1/auth/register    {name, email, password}
POST /api/v1/auth/login       form: username=email, password=...
GET  /api/v1/auth/me          → {id, name, email}

# Repositories
GET    /api/v1/repositories
POST   /api/v1/repositories   {owner, name, github_token?}
GET    /api/v1/repositories/{id}
DELETE /api/v1/repositories/{id}

# Analyses
GET    /api/v1/analyses                          → все анализы пользователя
GET    /api/v1/repositories/{id}/analyses        → анализы репозитория
POST   /api/v1/repositories/{id}/analyses        {start_date, end_date}
GET    /api/v1/analyses/{id}                     → полный результат с contributors
DELETE /api/v1/analyses/{id}
```

Все эндпоинты (кроме register/login) требуют заголовок:
```
Authorization: Bearer <jwt_token>
```
from github import Github, Auth
from os import getenv
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

load_dotenv()

github_token = getenv("GITHUB_TOKEN")
print(github_token)
auth = Auth.Token(github_token)

g = Github(auth=auth)

# Берём публичный репозиторий для теста
repo = g.get_repo("tiangolo/fastapi")

print("=" * 60)
print(f"Репозиторий: {repo.full_name}")
print(f"Описание: {repo.description}")
print(f"Звёзды: {repo.stargazers_count}")
print(f"Форки: {repo.forks_count}")
print(f"Язык: {repo.language}")
print(f"Открытых issues: {repo.open_issues_count}")
print("=" * 60)

# Период: последние 30 дней
since = datetime.now(timezone.utc) - timedelta(days=30)

print(f"\n📊 Коммиты за последние 30 дней (с {since.date()}):")
print("-" * 60)

commits = repo.get_commits(since=since)

# Агрегируем по авторам
author_stats: dict[str, dict] = {}

count = 0
for commit in commits:
    if count >= 50:  # ограничиваем для теста
        break
    count += 1

    author = commit.author
    login = author.login if author else "unknown"

    if login not in author_stats:
        author_stats[login] = {
            "commits": 0,
            "avatar": author.avatar_url if author else "",
        }
    author_stats[login]["commits"] += 1

# Сортируем по количеству коммитов
sorted_authors = sorted(author_stats.items(), key=lambda x: x[1]["commits"], reverse=True)

print(f"Всего обработано коммитов: {count}")
print(f"Уникальных авторов: {len(author_stats)}")
print()

for login, stats in sorted_authors[:10]:
    print(f"  👤 {login}: {stats['commits']} коммитов")

print("\n" + "=" * 60)
print("📋 Pull Requests за последние 30 дней:")
print("-" * 60)

pulls = repo.get_pulls(state="all", sort="created", direction="desc")

pr_stats: dict[str, dict] = {}
pr_count = 0

for pr in pulls:
    if pr.created_at < since:
        break
    if pr_count >= 30:
        break
    pr_count += 1

    login = pr.user.login if pr.user else "unknown"
    if login not in pr_stats:
        pr_stats[login] = {"opened": 0, "merged": 0}

    pr_stats[login]["opened"] += 1
    if pr.merged:
        pr_stats[login]["merged"] += 1

print(f"Всего PR за период: {pr_count}")
print(f"Авторов PR: {len(pr_stats)}")
print()

for login, stats in sorted(pr_stats.items(), key=lambda x: x[1]["opened"], reverse=True)[:10]:
    merge_rate = round(stats["merged"] / stats["opened"] * 100) if stats["opened"] > 0 else 0
    print(f"  🔀 {login}: открыто={stats['opened']}, смёрджено={stats['merged']} ({merge_rate}%)")

print("\n✅ Тест завершён!")
g.close()

from __future__ import annotations

import logging
from dataclasses import dataclass

log = logging.getLogger(__name__)


@dataclass
class ScoredContributor:
    github_login: str
    avatar_url: str
    commits_count: int
    additions: int
    deletions: int
    prs_opened: int
    prs_merged: int
    reviews_given: int
    score: float


def _normalize(values: list[float]) -> list[float]:
    if not values:
        return values
    mn, mx = min(values), max(values)
    if mx == mn:
        return [1.0] * len(values)
    return [(v - mn) / (mx - mn) for v in values]


def compute_scores(contributors_raw: list[dict]) -> list[ScoredContributor]:
    if not contributors_raw:
        return []

    commits = [float(c.get("commits_count", 0)) for c in contributors_raw]
    additions = [float(c.get("additions", 0)) for c in contributors_raw]
    prs_merged = [float(c.get("prs_merged", 0)) for c in contributors_raw]
    reviews = [float(c.get("reviews_given", 0)) for c in contributors_raw]

    n_commits = _normalize(commits)
    n_additions = _normalize(additions)
    n_prs_merged = _normalize(prs_merged)
    n_reviews = _normalize(reviews)

    scored: list[ScoredContributor] = []
    for i, c in enumerate(contributors_raw):
        raw_score = (
            0.35 * n_commits[i]
            + 0.20 * n_additions[i]
            + 0.20 * n_prs_merged[i]
            + 0.25 * n_reviews[i]
        )
        score = round(raw_score * 100, 1)
        scored.append(
            ScoredContributor(
                github_login=c.get("github_login", "unknown"),
                avatar_url=c.get("avatar_url", ""),
                commits_count=int(c.get("commits_count", 0)),
                additions=int(c.get("additions", 0)),
                deletions=int(c.get("deletions", 0)),
                prs_opened=int(c.get("prs_opened", 0)),
                prs_merged=int(c.get("prs_merged", 0)),
                reviews_given=int(c.get("reviews_given", 0)),
                score=score,
            )
        )
    return scored


def _local_report(scored: list[ScoredContributor], start_date: str, end_date: str) -> str:
    if not scored:
        return "Нет данных для анализа."

    sorted_c = sorted(scored, key=lambda x: x.score, reverse=True)
    avg_score = sum(c.score for c in scored) / len(scored)
    total_commits = sum(c.commits_count for c in scored)
    total_prs = sum(c.prs_opened for c in scored)
    total_reviews = sum(c.reviews_given for c in scored)

    lines = [
        f"Период анализа: {start_date} — {end_date}",
        f"Участников: {len(scored)} | Коммитов: {total_commits} | PR: {total_prs} | Reviews: {total_reviews}",
        f"Средний score команды: {avg_score:.1f}/100",
        "",
        "Топ участников:",
    ]
    for rank, c in enumerate(sorted_c, 1):
        lines.append(
            f"  {rank}. {c.github_login} — score {c.score:.0f} "
            f"(commits: {c.commits_count}, PR merged: {c.prs_merged}, reviews: {c.reviews_given})"
        )

    leader = sorted_c[0]
    lines += [
        "",
        f"Лидер команды: {leader.github_login} (score {leader.score:.0f}).",
    ]

    low = [c for c in scored if c.score < 40]
    if low:
        logins = ", ".join(c.github_login for c in low)
        lines.append(
            f"Участники с низким score (<40): {logins}. "
            "Рекомендуется провести 1-on-1 и выяснить причины низкой активности."
        )

    lines.append(
        "\n(Отчёт сгенерирован локально — ключ OpenAI API не настроен.)"
    )
    return "\n".join(lines)


_MAX_CONTRIBUTORS_IN_PROMPT = 20


async def generate_ai_report(
    scored: list[ScoredContributor],
    start_date: str,
    end_date: str,
) -> str:
    from core.config import settings

    if not settings.openai.api_key:
        log.info("LLM API key not configured — using local report generator.")
        return _local_report(scored, start_date, end_date)

    try:
        from openai import AsyncOpenAI

        client_kwargs: dict = {"api_key": settings.openai.api_key}
        if settings.openai.base_url:
            client_kwargs["base_url"] = settings.openai.base_url
            log.info("Using custom LLM base URL: %s", settings.openai.base_url)

        client = AsyncOpenAI(**client_kwargs)

        top_contributors = sorted(scored, key=lambda x: x.score, reverse=True)[:_MAX_CONTRIBUTORS_IN_PROMPT]
        total = len(scored)
        shown = len(top_contributors)

        contributors_summary = "\n".join(
            f"- {c.github_login}: commits={c.commits_count}, additions={c.additions}, "
            f"deletions={c.deletions}, prs_opened={c.prs_opened}, prs_merged={c.prs_merged}, "
            f"reviews_given={c.reviews_given}, score={c.score:.1f}/100"
            for c in top_contributors
        )

        suffix = (
            f"\n(Показаны топ-{shown} из {total} участников по score.)"
            if total > shown else ""
        )

        prompt = (
            f"Ты — аналитик эффективности команды разработчиков. "
            f"Проанализируй метрики команды за период {start_date} — {end_date} "
            f"и дай краткий отчёт на русском языке (3-5 абзацев) с выводами и рекомендациями.\n\n"
            f"Метрики участников (score 0-100, где 100 — максимальный вклад):\n"
            f"{contributors_summary}{suffix}\n\n"
            f"Укажи: общую оценку команды, лидеров, отстающих, рекомендации."
        )

        response = await client.chat.completions.create(
            model=settings.openai.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.7,
        )
        return response.choices[0].message.content or _local_report(scored, start_date, end_date)

    except Exception as exc:
        log.warning("LLM API call failed: %s — falling back to local report.", exc)
        return _local_report(scored, start_date, end_date)

import type { Repository, Analysis, AnalysisResult } from "../types";

export const MOCK_REPOS: Repository[] = [
  {
    id: 1,
    owner: "facebook",
    name: "react",
    created_at: "2025-03-01T10:00:00Z",
  },
  {
    id: 2,
    owner: "tiangolo",
    name: "fastapi",
    created_at: "2025-03-10T10:00:00Z",
  },
];

export const MOCK_ANALYSES: Analysis[] = [
  {
    id: 1,
    repository_id: 1,
    start_date: "2025-03-01",
    end_date: "2025-03-20",
    status: "completed",
    created_at: "2025-03-20T14:32:00Z",
  },
  {
    id: 2,
    repository_id: 1,
    start_date: "2025-02-01",
    end_date: "2025-02-28",
    status: "completed",
    created_at: "2025-02-28T10:15:00Z",
  },
  {
    id: 3,
    repository_id: 2,
    start_date: "2025-03-01",
    end_date: "2025-03-15",
    status: "completed",
    created_at: "2025-03-15T10:15:00Z",
  },
];

export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  id: 1,
  repository_id: 1,
  start_date: "2025-03-01",
  end_date: "2025-03-20",
  status: "completed",
  created_at: "2025-03-20T14:32:00Z",
  contributors: [
    {
      id: 1,
      github_login: "gaearon",
      avatar_url: "https://avatars.githubusercontent.com/u/810438",
      commits_count: 42,
      additions: 1840,
      deletions: 620,
      prs_opened: 8,
      prs_merged: 7,
      reviews_given: 15,
      score: 87,
    },
    {
      id: 2,
      github_login: "sebmarkbage",
      avatar_url: "https://avatars.githubusercontent.com/u/63648",
      commits_count: 35,
      additions: 2100,
      deletions: 980,
      prs_opened: 6,
      prs_merged: 6,
      reviews_given: 12,
      score: 82,
    },
    {
      id: 3,
      github_login: "acdlite",
      avatar_url: "https://avatars.githubusercontent.com/u/3624098",
      commits_count: 28,
      additions: 950,
      deletions: 310,
      prs_opened: 5,
      prs_merged: 4,
      reviews_given: 18,
      score: 79,
    },
    {
      id: 4,
      github_login: "rickhanlonii",
      avatar_url: "https://avatars.githubusercontent.com/u/2440089",
      commits_count: 19,
      additions: 430,
      deletions: 120,
      prs_opened: 4,
      prs_merged: 3,
      reviews_given: 22,
      score: 71,
    },
    {
      id: 5,
      github_login: "gnoff",
      avatar_url: "https://avatars.githubusercontent.com/u/6885957",
      commits_count: 12,
      additions: 280,
      deletions: 90,
      prs_opened: 2,
      prs_merged: 1,
      reviews_given: 8,
      score: 45,
    },
  ],
  ai_report: `Общая оценка команды: 8/10

Команда демонстрирует высокую активность в период с 1 по 20 марта. Лидером по вкладу является gaearon (score 87): 42 коммита, 7 из 8 PR смёрджено, активное участие в code review.

sebmarkbage внёс наибольший объём изменений (+2100 строк). Рекомендуется убедиться, что изменения покрыты тестами.

gnoff показывает низкий score (45): мало коммитов, только 1 из 2 PR принят. Рекомендуется провести 1-on-1 и выяснить причины низкой активности.

В целом команда хорошо справляется с code review — среднее время рассмотрения PR составляет 1.5 дня. Рекомендуется поддерживать этот показатель.`,
};

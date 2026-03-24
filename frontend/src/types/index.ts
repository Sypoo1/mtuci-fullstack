export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Repository {
  id: number;
  owner: string;
  name: string;
  created_at: string;
}

export interface Analysis {
  id: number;
  repository_id: number;
  start_date: string;
  end_date: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
}

export interface ContributorMetrics {
  id: number;
  github_login: string;
  avatar_url: string;
  commits_count: number;
  additions: number;
  deletions: number;
  prs_opened: number;
  prs_merged: number;
  reviews_given: number;
  score: number;
}

export interface AnalysisResult extends Analysis {
  contributors: ContributorMetrics[];
  ai_report: string | null;
}

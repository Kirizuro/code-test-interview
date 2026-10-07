export const CANDIDATE_STATUSES = ["new", "contacted", "interviewing", "hired"] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export type Candidate = {
  id: string;
  name: string;
  email: string;
  status: CandidateStatus;
  updatedAt: string;
};

export type CandidateResponse = {
  data: Candidate[];
  page: number;
  pageSize: number;
  total: number;
};

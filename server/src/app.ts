import express, { type ErrorRequestHandler, type Express } from "express";
import type { CandidateRepository } from "./modules/candidates/candidateRepository.js";
import { createCandidatesRouter } from "./modules/candidates/candidatesRouter.js";
import { createInMemoryCandidateRepository } from "./modules/candidates/inMemoryCandidateRepository.js";
import { seedCandidates } from "./modules/candidates/seedCandidates.js";

export type AppOptions = {
  candidateRepository?: CandidateRepository;
};

const handleUnexpectedError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
};

export function createApp(options: AppOptions = {}): Express {
  const candidateRepository =
    options.candidateRepository ??
    createInMemoryCandidateRepository(seedCandidates);

  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/candidates", createCandidatesRouter(candidateRepository));

  app.use(handleUnexpectedError);

  return app;
}

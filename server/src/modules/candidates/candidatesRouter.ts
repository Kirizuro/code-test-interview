import { Router } from "express";
import type { CandidateRepository } from "./candidateRepository.js";
import { listCandidates } from "./listCandidates.js";
import { parseListCandidatesQuery } from "./parseListCandidatesQuery.js";

export function createCandidatesRouter(repository: CandidateRepository): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    const parsed = parseListCandidatesQuery(req.query);

    if (!parsed.ok) {
      res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
          details: parsed.errors,
        },
      });
      return;
    }

    res.json(await listCandidates(repository, parsed.params));
  });

  return router;
}

import type { Express, RequestHandler } from "express";
import { z } from "zod";
import type { ProductService } from "./service.ts";

const id = (value: unknown) => z.string().min(1).max(150).parse(value);
const versionBody = z
  .object({
    instructions: z.string().max(20000).optional(),
  })
  .strict();
const instructionsBody = z
  .object({
    instructions: z.string().min(1).max(20000),
  })
  .strict();

/**
 * The AI Quality Lab routes. Every one of them is owner-only: authoring a
 * prompt, authoring a case and publishing a version are owner decisions.
 */
export function mountQualityRoutes(
  app: Express,
  service: ProductService,
  owner: RequestHandler,
) {
  const quality = service.quality;
  app.get("/api/quality", owner, async (req, res) =>
    res.json(await quality.overview(req.actor!.workspaceId)),
  );
  app.post("/api/quality/versions", owner, async (req, res) =>
    res
      .status(201)
      .json(
        await quality.createVersion(
          req.actor!,
          versionBody.parse(req.body ?? {}).instructions,
        ),
      ),
  );
  app.patch("/api/quality/versions/:id", owner, async (req, res) =>
    res.json(
      await quality.updateVersion(
        req.actor!,
        id(req.params.id),
        instructionsBody.parse(req.body).instructions,
      ),
    ),
  );
  app.post("/api/quality/versions/:id/publish", owner, async (req, res) =>
    res.json(await quality.publishVersion(req.actor!, id(req.params.id))),
  );
  app.post("/api/quality/versions/:id/run", owner, async (req, res) =>
    res.status(202).json(await quality.enqueueRun(req.actor!, id(req.params.id))),
  );
  app.post("/api/quality/cases", owner, async (req, res) =>
    res.status(201).json(await quality.createCase(req.actor!, req.body)),
  );
  app.patch("/api/quality/cases/:id", owner, async (req, res) =>
    res.json(
      await quality.updateCase(req.actor!, id(req.params.id), req.body),
    ),
  );
  app.delete("/api/quality/cases/:id", owner, async (req, res) =>
    res.json(await quality.deleteCase(req.actor!, id(req.params.id))),
  );
}

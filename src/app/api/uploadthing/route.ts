import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Serves the UploadThing endpoints (GET for config, POST for uploads).
// Reads UPLOADTHING_TOKEN from the environment; if unset, uploads simply fail
// at runtime but the route still compiles and mounts.
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});

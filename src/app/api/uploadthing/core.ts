import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { getAuthenticatedUser, verifyProjectAccess } from "@/lib/auth-utils";

const f = createUploadthing();

/**
 * UploadThing file router for the client project workspace.
 *
 * `projectFile` accepts PDFs, images and zip archives. The `.middleware`
 * authenticates the caller via Clerk (through `getAuthenticatedUser`) and
 * verifies the caller may access the target project *before* any upload is
 * allowed, so an unauthenticated or unauthorized user can never push bytes.
 *
 * The database `files` row is recorded client-side via `POST /api/files`
 * after the upload completes (see `onClientUploadComplete` in client.tsx).
 * `onUploadComplete` here simply returns metadata to the client.
 */
export const ourFileRouter = {
  projectFile: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "8MB", maxFileCount: 10 },
    "application/zip": { maxFileSize: "64MB", maxFileCount: 5 },
  })
    .input(z.object({ projectId: z.string().uuid() }))
    .middleware(async ({ input }) => {
      // `getAuthenticatedUser` throws (rejecting the upload) if not signed in
      // or if the Clerk user has no matching DB record.
      let user;
      try {
        user = await getAuthenticatedUser();
      } catch {
        throw new UploadThingError("Unauthorized");
      }

      // Confirm this user is allowed to touch the project they claim to be
      // uploading to. `verifyProjectAccess` throws on failure.
      try {
        await verifyProjectAccess(input.projectId, user.id, user.role);
      } catch {
        throw new UploadThingError("Forbidden");
      }

      return { userId: user.id, projectId: input.projectId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // The DB record is created client-side via /api/files. Return metadata
      // so the client's onClientUploadComplete has everything it needs.
      return {
        uploadedBy: metadata.userId,
        projectId: metadata.projectId,
        name: file.name,
        url: file.ufsUrl,
        size: file.size,
        type: file.type,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

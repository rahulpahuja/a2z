export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // GET handler: Serve files from the bound R2 bucket
    if (request.method === "GET") {
      try {
        const key = decodeURIComponent(url.pathname.substring(1)); // Remove the leading slash
        
        if (!key || key === "upload") {
          return new Response("Not Found", { status: 404, headers: corsHeaders });
        }

        if (!env.BUCKET) {
          throw new Error("R2 Bucket binding 'BUCKET' is missing.");
        }

        const object = await env.BUCKET.get(key);
        if (!object) {
          return new Response("Object Not Found", { status: 404, headers: corsHeaders });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Access-Control-Allow-Origin", "*"); // Allow browser rendering CORS

        return new Response(object.body, {
          headers,
        });
      } catch (err) {
        return new Response(err.message, { status: 500, headers: corsHeaders });
      }
    }

    // POST handler: Upload files to the bound R2 bucket
    if (request.method === "POST") {
      try {
        if (url.pathname === "/upload") {
          if (!env.BUCKET) {
            throw new Error("R2 Bucket binding 'BUCKET' is missing. Please check your wrangler.toml configuration.");
          }

          // Parse form data
          const formData = await request.formData();
          const file = formData.get("file");
          if (!file) {
            return new Response("No file provided in form field 'file'", {
              status: 400,
              headers: corsHeaders,
            });
          }

          const fileData = await file.arrayBuffer();
          const uniqueFileName = file.name.replace(/\s+/g, "_");

          const ext = uniqueFileName.split('.').pop().toLowerCase();
          const mimeTypes = {
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'm4v': 'video/x-m4v',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
          };
          const contentType = file.type && file.type !== "application/octet-stream"
            ? file.type
            : (mimeTypes[ext] || "application/octet-stream");

          // Upload to R2 securely
          await env.BUCKET.put(uniqueFileName, fileData, {
            httpMetadata: { contentType },
          });

          // Construct public URL dynamically using request origin for local testing,
          // or env.R2_PUBLIC_URL for custom production domains.
          const publicUrlBase = env.R2_PUBLIC_URL || url.origin;
          const publicUrl = `${publicUrlBase}/${uniqueFileName}`;

          return new Response(
            JSON.stringify({
              success: true,
              url: publicUrl,
              key: uniqueFileName,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // DELETE handler: Delete files from the bound R2 bucket
    if (request.method === "DELETE") {
      try {
        const key = decodeURIComponent(url.pathname.substring(1)); // Remove the leading slash
        
        if (!key || key === "upload") {
          return new Response("Not Found", { status: 404, headers: corsHeaders });
        }

        if (!env.BUCKET) {
          throw new Error("R2 Bucket binding 'BUCKET' is missing.");
        }

        // Delete from R2
        await env.BUCKET.delete(key);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Object '${key}' deleted successfully.`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};

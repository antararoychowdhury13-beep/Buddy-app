import "dotenv/config";

/**
 * Lightweight smoke test for POST /speech. Verifies the endpoint's contract
 * (status codes, content type, non-empty body, a valid WAV header) — not
 * subjective audio quality, which no automated test here attempts to judge.
 *
 * Run with: npm run test:speech
 * Note: the first run may take a while (and needs network access) since it
 * triggers Kokoro's one-time model download; subsequent runs are fast.
 */

let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures++;
  }
}

function isValidWavHeader(buf: Buffer): boolean {
  return (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WAVE"
  );
}

async function main() {
  // Importing server.ts starts the actual Express app (side effect of app.listen).
  const { server } = await import("../src/server.js");
  const port = Number(process.env.PORT ?? 3000);
  const base = `http://localhost:${port}`;

  // Give the server a moment to finish binding before the first request.
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log("Valid request:");
  {
    const res = await fetch(`${base}/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hi there." }),
    });
    const buf = Buffer.from(await res.arrayBuffer());
    check("returns 200", res.status === 200);
    check("content-type is audio/wav", res.headers.get("content-type") === "audio/wav");
    check("body is non-empty", buf.length > 0);
    check("WAV header is valid", isValidWavHeader(buf));
  }

  console.log("\nInvalid requests:");
  {
    const res = await fetch(`${base}/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
    check("empty text returns 400", res.status === 400);
  }
  {
    const res = await fetch(`${base}/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: 12345 }),
    });
    check("non-string text returns 400", res.status === 400);
  }
  {
    const res = await fetch(`${base}/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "a".repeat(1501) }),
    });
    check("oversized text (>1500 chars) returns 400", res.status === 400);
  }

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);

  // Close the HTTP server and let Node exit on its own so the ONNX runtime's
  // native threads wind down cleanly, rather than force-killing them with
  // process.exit() (which crashes with a native mutex error mid-teardown).
  process.exitCode = failures === 0 ? 0 : 1;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

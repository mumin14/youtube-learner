import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query } = (await req.json()) as { query: string };

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Exa API key not configured. Add EXA_API_KEY to your .env.local file." },
      { status: 500 }
    );
  }

  const exa = new Exa(apiKey);

  try {
    const result = await exa.search(
      `academic journal article research paper: ${query.trim()}`,
      {
        numResults: 10,
        contents: {
          text: { maxCharacters: 50000 },
          summary: true,
        },
        includeDomains: [
          "scholar.google.com",
          "pubmed.ncbi.nlm.nih.gov",
          "arxiv.org",
          "researchgate.net",
          "sciencedirect.com",
          "springer.com",
          "nature.com",
          "ieee.org",
          "jstor.org",
          "ncbi.nlm.nih.gov",
          "journals.sagepub.com",
          "wiley.com",
          "tandfonline.com",
          "frontiersin.org",
          "mdpi.com",
          "plos.org",
          "biorxiv.org",
          "ssrn.com",
          "academic.oup.com",
        ],
      }
    );

    const articles = result.results.map((r) => {
      const text = (r as Record<string, unknown>).text as string | undefined;
      return {
        title: r.title || "Untitled",
        url: r.url,
        author: r.author || null,
        publishedDate: r.publishedDate || null,
        summary: (r as Record<string, unknown>).summary || null,
        score: r.score || null,
        favicon: r.favicon || null,
        hasFullText: !!text && text.length > 200,
        textLength: text?.length || 0,
      };
    });

    return NextResponse.json({ articles });
  } catch (err) {
    console.error("Exa search failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}

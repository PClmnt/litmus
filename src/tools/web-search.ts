// Web search tool for testing model tool-use capabilities
import { z } from "zod";
import { tool } from "ai";

/*
    {
      "id": "https://aws.amazon.com/blogs/machine-learning/",
      "title": "Artificial Intelligence - AWS",
      "url": "https://aws.amazon.com/blogs/machine-learning/",
      "publishedDate": "2025-12-23T00:00:00.000Z",
      "author": null,
      "text": "Artificial Intelligence[Skip to Main Content](#aws-page-content-main)\nAWS Blogs\n* [Home](https://aws.amazon.com/blogs/)\n* Blogs\n* Editions\n# Artificial Intelligence\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/29/ml-19189-1024x576.png)](https://aws.amazon.com/blogs/machine-learning/migrate-mlflow-tracking-servers-to-amazon-sagemaker-ai-with-serverless-mlflow/)\n## [Migrate MLflow tracking servers to Amazon SageMaker AI with serverless MLflow](https://aws.amazon.com/blogs/machine-learning/migrate-mlflow-tracking-servers-to-amazon-sagemaker-ai-with-serverless-mlflow/)\nThis post shows you how to migrate your self-managed MLflow tracking server to a MLflow App –a serverless tracking server on SageMaker AI that automatically scales resources based on demand while removing server patching and storage management tasks at no cost. Learn how to use the MLflow Export Import tool to transfer your experiments, runs, models, and other MLflow resources, including instructions to validate your migration’s success.\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/29/ml-17474-1-1024x576.png)](https://aws.amazon.com/blogs/machine-learning/build-an-ai-powered-website-assistant-with-amazon-bedrock/)\n## [Build an AI-powered website assistant with Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/build-an-ai-powered-website-assistant-with-amazon-bedrock/)\nThis post demonstrates how to solve this challenge by building an AI-powered website assistant using Amazon Bedrock and Amazon Bedrock Knowledge Bases.\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/24/ml-18711-1024x576.png)](https://aws.amazon.com/blogs/machine-learning/programmatically-creating-an-idp-solution-with-amazon-bedrock-data-automation/)\n## [Programmatically creating an IDP solution with Amazon Bedrock Data Automation](https://aws.amazon.com/blogs/machine-learning/programmatically-creating-an-idp-solution-with-amazon-bedrock-data-automation/)\nIn this post, we explore how to programmatically create an IDP solution that usesStrands SDK,Amazon Bedrock AgentCore,Amazon Bedrock Knowledge Base, andBedrock Data Automation (BDA). This solution is provided through a Jupyter notebook that enables users to upload multi-modal business documents and extract insights using BDA as a parser to retrieve relevant chunks and augment a prompt to a foundational model (FM).\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/24/ml-19969-1024x576.png)](https://aws.amazon.com/blogs/machine-learning/ai-agent-driven-browser-automation-for-enterprise-workflow-management/)\n## [AI agent-driven browser automation for enterprise workflow management](https://aws.amazon.com/blogs/machine-learning/ai-agent-driven-browser-automation-for-enterprise-workflow-management/)\nEnterprise organizations increasingly rely on web-based applications for critical business processes, yet many workflows remain manually intensive, creating operational inefficiencies and compliance risks. Despite significant technology investments, knowledge workers routinely navigate between eight to twelve different web applications during standard workflows, constantly switching contexts and manually transferring information between systems. Data entry and validation tasks […]\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/24/ml-19972-1024x576.png)](https://aws.amazon.com/blogs/machine-learning/agentic-qa-automation-using-amazon-bedrock-agentcore-browser-and-amazon-nova-act/)\n## [Agentic QA automation using Amazon Bedrock AgentCore Browser and Amazon Nova Act](https://aws.amazon.com/blogs/machine-learning/agentic-qa-automation-using-amazon-bedrock-agentcore-browser-and-amazon-nova-act/)\nIn this post, we explore how agentic QA automation addresses these challenges and walk through a practical example using Amazon Bedrock AgentCore Browser and Amazon Nova Act to automate testing for a sample retail application.\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/24/ml-19976-1024x576.png)](https://aws.amazon.com/blogs/machine-learning/optimizing-llm-inference-on-amazon-sagemaker-ai-with-bentomls-llm-optimizer/)\n## [Optimizing LLM inference on Amazon SageMaker AI with BentoML’s LLM- Optimizer](https://aws.amazon.com/blogs/machine-learning/optimizing-llm-inference-on-amazon-sagemaker-ai-with-bentomls-llm-optimizer/)\nIn this post, we demonstrate how to optimize large language model (LLM) inference on Amazon SageMaker AI using BentoML’s LLM-Optimizer to systematically identify the best serving configurations for your workload.\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/23/ML-20238-image-1.jpeg)](https://aws.amazon.com/blogs/machine-learning/exploring-the-zero-operator-access-design-of-mantle/)\n## [Exploring the zero operator access design of Mantle](https://aws.amazon.com/blogs/machine-learning/exploring-the-zero-operator-access-design-of-mantle/)\nIn this post, we explore how Mantle, Amazon’s next-generation inference engine for Amazon Bedrock, implements a zero operator access (ZOA) design that eliminates any technical means for AWS operators to access customer data.\n[![Figure 2: AWS AI League Championship steps](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/22/ML-20061-image-3-1024x388.png)](https://aws.amazon.com/blogs/machine-learning/aws-ai-league-model-customization-and-agentic-showdown/)\n## [AWS AI League: Model customization and agentic showdown](https://aws.amazon.com/blogs/machine-learning/aws-ai-league-model-customization-and-agentic-showdown/)\nIn this post, we explore the new AWS AI League challenges and how they are transforming how organizations approach AI development. The grand finale at AWS re:Invent 2025 was an exciting showcase of their ingenuity and skills.\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/23/ml-17474-1024x576.png)](https://aws.amazon.com/blogs/machine-learning/accelerate-enterprise-ai-development-using-weights-biases-weave-and-amazon-bedrock-agentcore/)\n## [Accelerate Enterprise AI Development using Weights &amp; Biases and Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/accelerate-enterprise-ai-development-using-weights-biases-weave-and-amazon-bedrock-agentcore/)\nIn this post, we demonstrate how to use Foundation Models (FMs) from Amazon Bedrock and the newly launched Amazon Bedrock AgentCore alongside W&amp;B Weave to help build, evaluate, and monitor enterprise AI solutions. We cover the complete development lifecycle from tracking individual FM calls to monitoring complex agent workflows in production.\n[![](https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/23/ml-19345-1024x576.png)](https://aws.amazon.com/blogs/machine-learning/how-dlocal-automated-compliance-reviews-using-amazon-quick-automate/)\n## [How dLocal automated compliance reviews using Amazon Quick Automate](https://aws.amazon.com/blogs/machine-learning/how-dlocal-automated-compliance-reviews-using-amazon-quick-automate/)\nIn this post, we share how dLocal worked closely with the AWS team to help shape the product roadmap, reinforce its role as an industry innovator, and set new benchmarks for operational excellence in the global fintech landscape.\n[← Older posts](https://aws.amazon.com/blogs/machine-learning/page/2/)",
      "image": "https://d2908q01vomqb2.cloudfront.net/f1f836cb4ea6efb2a0b1b99f41ad8b103eff4b59/2025/12/29/ml-19189-1024x576.png",
      "favicon": "https://a0.awsstatic.com/main/images/site/fav/favicon.ico"
    },

*/

interface SearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string | null;
  score?: number | null;
  text: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
  subpages?: SearchResult[];
  extras?: {
    links?: string[];
    imageLinks?: string[];
  };
  image: string;
  favicon: string;
}

interface RawSearchResult {
  id?: string;
  title?: string;
  url: string;
  publishedDate?: string | null;
  author?: string | null;
  score?: number | null;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
  subpages?: RawSearchResult[];
  extras?: {
    links?: string[];
    imageLinks?: string[];
  };
  image?: string;
  favicon?: string;
}

interface SearchRequest {
  query: string;
  numResults: number;
  contents?: {
    text?: boolean | { maxCharacters?: number; includeHtmlTags?: boolean };
    highlights?: {
      numSentences?: number;
      highlightsPerUrl?: number;
      query?: string;
    };
    summary?: {
      query?: string;
      schema?: Record<string, unknown>;
    };
    subpages?: number;
    subpageTarget?: string | string[];
    extras?: {
      links?: number;
      imageLinks?: number;
    };
    livecrawl?: "never" | "fallback" | "always" | "preferred";
    livecrawlTimeout?: number;
    context?: boolean | { maxCharacters?: number };
  };
}

interface ExaSearchResponse {
  requestId?: string;
  results: SearchResult[];
}

const searchResultSchema: z.ZodType<RawSearchResult> = z.lazy(() =>
  z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      url: z.string(),
      publishedDate: z.string().nullable().optional(),
      author: z.string().nullable().optional(),
      score: z.number().nullable().optional(),
      text: z.string().optional(),
      highlights: z.array(z.string()).optional(),
      highlightScores: z.array(z.number()).optional(),
      summary: z.string().optional(),
      subpages: z.array(searchResultSchema).optional(),
      extras: z
        .object({
          links: z.array(z.string()).optional(),
          imageLinks: z.array(z.string()).optional(),
        })
        .partial()
        .optional(),
      image: z.string().optional(),
      favicon: z.string().optional(),
    })
    .passthrough()
);

const exaSearchResponseSchema = z
  .object({
    requestId: z.string().optional(),
    results: z.array(searchResultSchema),
  })
  .passthrough();

function normalizeSearchResult(result: RawSearchResult): SearchResult {
  return {
    id: result.id ?? result.url,
    title: result.title ?? "",
    url: result.url,
    publishedDate: result.publishedDate ?? "",
    author: result.author ?? null,
    score: result.score ?? null,
    text: result.text ?? "",
    highlights: result.highlights ?? [],
    highlightScores: result.highlightScores ?? [],
    summary: result.summary ?? "",
    subpages: result.subpages
      ? result.subpages.map((subpage) => normalizeSearchResult(subpage))
      : [],
    extras: result.extras ?? undefined,
    image: result.image ?? "",
    favicon: result.favicon ?? "",
  };
}
export const webSearchTool = tool({
  title: "Web Search Tool",
  description:
    "Search the web for information. Returns relevant snippets from search results. Use this when you need to look up facts, current information, or verify data.",
  inputSchema: z.object({
    query: z.string().describe("Search query to look up"),
    maxResults: z
      .number()
      .optional()
      .default(3)
      .describe("Maximum number of results to return (default: 3)"),
  }),
  execute: async ({
    query,
    maxResults = 3,
  }: {
    query: string;
    maxResults?: number;
  }) => {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error("Missing EXA_API_KEY (required for webSearch tool)");
    }

    const numResults = Math.max(1, Math.min(100, Math.floor(maxResults)));
    const raw = await apiRequest<unknown, SearchRequest>(
      "https://api.exa.ai/search",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
        },
        body: {
          query,
          numResults,
          contents: { text: true },
        },
      }
    );

    const parsed = exaSearchResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Invalid Exa response shape: ${
          parsed.error.message
        }. Raw: ${JSON.stringify(raw)}`
      );
    }

    const result: ExaSearchResponse = {
      requestId: parsed.data.requestId,
      results: parsed.data.results.map((r) => normalizeSearchResult(r)),
    };
    return {
      query,
      results: result.results.slice(0, numResults),
      totalResults: result.results.length,
    };
  },
});

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

type ApiRequestOptions<TBody> = {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: TBody;
};

async function apiRequest<TResponse, TBody = unknown>(
  url: string,
  options: ApiRequestOptions<TBody>
): Promise<TResponse> {
  let { method = "GET", headers, body, ...rest } = options;

  if (body) {
    headers = {
      ...headers,
      "Content-Type": "application/json",
    };
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `HTTP error! status: ${response.status}${
        errorBody ? ` body: ${errorBody}` : ""
      }`
    );
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as TResponse;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON response: ${
        err instanceof Error ? err.message : String(err)
      }. Body: ${text}`
    );
  }
}

import type { EventType } from "../scoring/momentum.ts";

export const seedNow = new Date("2026-04-03T14:30:00-05:00");

export type CategoryAccent = "green" | "red" | "blue" | "amber" | "purple" | "neutral";
export type ImportanceLevel = "Critical" | "Notable" | "Standard";
export type ConfidenceLevel = "High" | "Medium" | "Developing";
export type TrendDirection = "↑↑" | "↑" | "→" | "↓" | "↓↓";
export type LaunchType = "MODEL" | "PRODUCT" | "PLATFORM" | "API";
export type ImpactDirection = "positive" | "negative" | "neutral";

export type NewsCategory = {
  slug: string;
  name: string;
  accent: CategoryAccent;
};

export type NewsTag = {
  slug: string;
  name: string;
};

export type CompanyProduct = {
  name: string;
  type: string;
  description: string;
  launchDate?: string;
};

export type Partnership = {
  name: string;
  detail: string;
};

export type Milestone = {
  date: string;
  title: string;
  detail: string;
};

export type CompanyProfile = {
  slug: string;
  name: string;
  shortName: string;
  color: string;
  description: string;
  overview: string;
  strengths: string[];
  weaknesses: string[];
  whyItMatters: string;
  valuationText?: string;
  websiteUrl: string;
  tags: string[];
  products: CompanyProduct[];
  partnerships: Partnership[];
  milestones: Milestone[];
  sparkline: number[];
};

export type NewsItem = {
  slug: string;
  headline: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  summary: string;
  shortSummary: string;
  whyItMatters: string;
  importanceScore: number;
  importanceLevel: ImportanceLevel;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  impactDirection: ImpactDirection;
  companySlugs: string[];
  categorySlugs: string[];
  tagSlugs: string[];
  breaking?: boolean;
};

export type MomentumEvent = {
  companySlug: string;
  newsSlug: string;
  eventType: EventType;
  scoreDelta: number;
  eventDate: string;
  explanation: string;
};

export type MomentumSnapshot = {
  companySlug: string;
  rank: number;
  score: number;
  scoreChange24h: number;
  scoreChange7d: number;
  trend: TrendDirection;
  keyDriver: string;
  sparkline: number[];
  driverNewsSlugs: string[];
};

export type LaunchCardData = {
  slug: string;
  type: LaunchType;
  name: string;
  companySlug: string;
  description: string;
  launchDate: string;
  accent: CategoryAccent;
};

export type TimelineEntry = {
  slug: string;
  companySlug: string;
  timestamp: string;
  headline: string;
  detail: string;
  live?: boolean;
};

export type TrendingTopic = {
  label: string;
  hot?: boolean;
};

export type TopMover = {
  label: string;
  companySlug: string;
  delta: number;
  reason: string;
  accent: CategoryAccent;
  chart: number[];
};

export type DailyDigest = {
  date: string;
  title: string;
  summary: string;
  biggestWinnerCompanySlug: string;
  biggestLoserCompanySlug: string;
  mostImportantNewsSlug: string;
  topStorySlugs: string[];
  watchNext: string[];
};

export const categories: NewsCategory[] = [
  { slug: "model-release", name: "Model Release", accent: "green" },
  { slug: "product-launch", name: "Product Launch", accent: "blue" },
  { slug: "funding", name: "Funding", accent: "purple" },
  { slug: "partnership", name: "Partnership", accent: "amber" },
  { slug: "research", name: "Research", accent: "green" },
  { slug: "policy-regulation", name: "Policy & Regulation", accent: "red" },
  { slug: "infrastructure", name: "Infrastructure", accent: "blue" },
  { slug: "leadership", name: "Leadership", accent: "purple" },
];

export const tags: NewsTag[] = [
  { slug: "gpt-5", name: "GPT-5" },
  { slug: "claude-4-6", name: "Claude 4.6" },
  { slug: "gemini-3", name: "Gemini 3.0" },
  { slug: "open-weight", name: "Open-Weight" },
  { slug: "enterprise", name: "Enterprise" },
  { slug: "reasoning", name: "Reasoning" },
  { slug: "safety", name: "Safety" },
  { slug: "chips", name: "Chips" },
  { slug: "data-centers", name: "Data Centers" },
  { slug: "agents", name: "Agents" },
  { slug: "eu-ai-act", name: "EU AI Act" },
  { slug: "multimodal", name: "Multimodal" },
  { slug: "api", name: "API" },
  { slug: "video", name: "Video" },
  { slug: "robotics", name: "Robotics" },
  { slug: "finance", name: "Finance" },
  { slug: "copilot", name: "Copilot" },
  { slug: "training-clusters", name: "Training Clusters" },
  { slug: "pricing", name: "Pricing" },
  { slug: "governance", name: "Governance" },
  { slug: "benchmarks", name: "Benchmarks" },
];

export const companies: CompanyProfile[] = [
  {
    slug: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    color: "#4D9FFF",
    description: "The market-setter in frontier consumer and enterprise AI, now pushing GPT-5 toward broad rollout.",
    overview:
      "OpenAI still sets the pace for the rest of the field. Its strength is not only frontier model capability, but distribution across ChatGPT, enterprise APIs, productivity workflows, and a widening infrastructure footprint.",
    strengths: [
      "Consumer reach through ChatGPT keeps product feedback loops unusually fast.",
      "Strong enterprise pipeline lets new model releases turn into revenue quickly.",
      "Deep partnerships and infrastructure investment support high-end training runs.",
    ],
    weaknesses: [
      "Every launch resets expectations, which raises delivery pressure.",
      "Regulatory scrutiny remains intense in the US and Europe.",
      "Heavy compute demand makes infrastructure execution a strategic constraint.",
    ],
    whyItMatters:
      "OpenAI matters because it defines the reference point for what frontier AI products feel like. When it ships, the rest of the market has to respond on capability, price, safety posture, or distribution.",
    valuationText: "Private; secondary market chatter points to a premium valuation above earlier 2025 levels.",
    websiteUrl: "https://openai.com",
    tags: ["GPT-5", "Agents", "Enterprise"],
    products: [
      {
        name: "GPT-5 Limited Preview",
        type: "Model",
        description: "Frontier reasoning and multimodal model in controlled enterprise release.",
        launchDate: "2026-04-03",
      },
      {
        name: "ChatGPT Enterprise",
        type: "Product",
        description: "Enterprise workspace for secure knowledge work, analysis, and automation.",
        launchDate: "2023-08-28",
      },
      {
        name: "Sora Studio",
        type: "Product",
        description: "Collaborative video generation and editing environment for creative teams.",
        launchDate: "2026-04-01",
      },
      {
        name: "OpenAI Agents API",
        type: "API",
        description: "Tool-calling and orchestration layer for persistent agent workflows.",
        launchDate: "2026-02-12",
      },
    ],
    partnerships: [
      {
        name: "Oracle",
        detail: "Expanded Stargate-linked data center capacity across Texas and Virginia.",
      },
      {
        name: "Microsoft",
        detail: "Continues to anchor distribution and enterprise procurement through Azure.",
      },
    ],
    milestones: [
      {
        date: "2026-04-03",
        title: "GPT-5 limited preview opens",
        detail: "OpenAI began controlled enterprise access to GPT-5 with emphasis on reasoning reliability.",
      },
      {
        date: "2026-04-01",
        title: "Sora Studio collaboration tools launch",
        detail: "Video workflows moved from solo generation to team review and production.",
      },
      {
        date: "2026-03-29",
        title: "Brussels safety center announced",
        detail: "The company positioned itself for the next phase of European compliance and policy engagement.",
      },
      {
        date: "2026-03-12",
        title: "Agents API usage crosses major enterprise milestone",
        detail: "OpenAI signaled rising demand for workflow automation beyond chat interfaces.",
      },
    ],
    sparkline: [6.2, 7.1, 7.9, 9.4, 11.3, 14.8, 18.4],
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    shortName: "Anthropic",
    color: "#FFB84D",
    description: "A fast-moving enterprise contender pairing strong model performance with a careful safety brand.",
    overview:
      "Anthropic has become the leading counterweight to OpenAI in enterprise and regulated deployments. Claude's appeal comes from strong writing, analysis, long-context work, and a product story that feels legible to cautious buyers.",
    strengths: [
      "Enterprise trust remains high, especially in regulated industries.",
      "Claude product line is strong at long-context reasoning and document work.",
      "Safety research and policy positioning create differentiation with large buyers.",
    ],
    weaknesses: [
      "Distribution is still narrower than OpenAI and Google.",
      "Product breadth outside core assistant workflows is still growing.",
      "Infrastructure dependence can limit rollout speed at peak demand moments.",
    ],
    whyItMatters:
      "Anthropic matters because it is proving that safety-heavy positioning and commercial momentum can coexist. Its progress pressures rivals on reliability, enterprise controls, and the quality of everyday model behavior.",
    valuationText: "Private; market observers expect the next financing to price in strong enterprise demand.",
    websiteUrl: "https://www.anthropic.com",
    tags: ["Claude 4.6", "Safety", "Enterprise"],
    products: [
      {
        name: "Claude 4.6 Opus",
        type: "Model",
        description: "Top-tier reasoning model with longer context and improved tool consistency.",
        launchDate: "2026-04-03",
      },
      {
        name: "Claude 4.6 Sonnet",
        type: "Model",
        description: "Balanced model tuned for everyday enterprise tasks and agent workflows.",
        launchDate: "2026-03-14",
      },
      {
        name: "Claude Code Enterprise",
        type: "Product",
        description: "Development assistant with enterprise controls, policy layers, and team workspaces.",
        launchDate: "2026-02-04",
      },
      {
        name: "Constitutional Ops Toolkit",
        type: "Platform",
        description: "Governance and evaluation package for regulated deployments.",
        launchDate: "2026-03-28",
      },
    ],
    partnerships: [
      {
        name: "Global European Bank",
        detail: "Claude rollout for analyst research, risk memos, and internal search at scale.",
      },
      {
        name: "Amazon Web Services",
        detail: "Preferred training and inference capacity agreement continues to deepen.",
      },
    ],
    milestones: [
      {
        date: "2026-04-03",
        title: "Claude 4.6 Opus ships",
        detail: "Anthropic moved quickly to capitalize on enterprise demand for dependable high-end reasoning.",
      },
      {
        date: "2026-04-01",
        title: "New deceptive reasoning eval framework published",
        detail: "The release reinforced Anthropic's research-forward positioning with cautious buyers.",
      },
      {
        date: "2026-03-28",
        title: "Constitutional Ops Toolkit launches",
        detail: "Anthropic packaged safety and governance into something procurement teams can understand.",
      },
      {
        date: "2026-03-10",
        title: "Claude Code Enterprise expands",
        detail: "Developer tooling became a more meaningful part of the company's product story.",
      },
    ],
    sparkline: [5.4, 6.1, 6.9, 8.2, 10.4, 12.1, 14.7],
  },
  {
    slug: "google-deepmind",
    name: "Google DeepMind",
    shortName: "Google DeepMind",
    color: "#7CC4FF",
    description: "Google's research and platform engine, pushing Gemini deeper into consumer and enterprise products.",
    overview:
      "Google DeepMind combines frontier research, distribution through Google products, and infrastructure scale that few rivals can match. The challenge is turning technical leadership into a cleaner market narrative.",
    strengths: [
      "World-class research bench and broad product surface area.",
      "Massive infrastructure and internal distribution across Workspace, Cloud, and Search.",
      "Strong multimodal stack spanning text, images, video, and agents.",
    ],
    weaknesses: [
      "Product messaging can feel fragmented across teams and brands.",
      "Regulatory exposure in Europe remains a persistent drag.",
      "Benchmark wins do not always translate into perceived momentum.",
    ],
    whyItMatters:
      "Google DeepMind matters because it can move the race at both the research layer and the distribution layer. When Gemini improves, those gains can ripple through productivity, cloud, search, and developer tools at once.",
    websiteUrl: "https://deepmind.google",
    tags: ["Gemini 3.0", "Agents", "Benchmarks"],
    products: [
      {
        name: "Gemini 3.0 Ultra",
        type: "Model",
        description: "Frontier multimodal reasoning model aimed at high-end enterprise and developer use cases.",
        launchDate: "2026-04-03",
      },
      {
        name: "Gemini Workspace Agents",
        type: "Product",
        description: "Cross-app agent actions inside Docs, Sheets, Gmail, and Meet.",
        launchDate: "2026-04-01",
      },
      {
        name: "Project Astra",
        type: "Platform",
        description: "Real-time assistant layer for ambient multimodal interaction.",
        launchDate: "2025-12-11",
      },
      {
        name: "Gemini API",
        type: "API",
        description: "Developer platform for model access, tools, and multimodal endpoints.",
        launchDate: "2025-11-06",
      },
    ],
    partnerships: [
      {
        name: "National Grid UK",
        detail: "Long-term power agreement aimed at stabilizing AI campus expansion.",
      },
      {
        name: "Google Workspace",
        detail: "Deep integration turns model improvements into end-user product changes quickly.",
      },
    ],
    milestones: [
      {
        date: "2026-04-03",
        title: "Gemini 3.0 benchmark sweep",
        detail: "Google highlighted reasoning wins as it tries to sharpen the Gemini narrative.",
      },
      {
        date: "2026-04-01",
        title: "Workspace agents ship",
        detail: "Gemini moved from assistant overlay to task execution layer inside core productivity software.",
      },
      {
        date: "2026-03-28",
        title: "UK power deal announced",
        detail: "Google signaled that infrastructure is still a competitive weapon in the model race.",
      },
      {
        date: "2026-03-01",
        title: "Gemini long-context pricing refreshed",
        detail: "Cloud positioning became more aggressive against OpenAI and Anthropic.",
      },
    ],
    sparkline: [4.2, 5.1, 5.8, 6.9, 8.4, 9.9, 11.2],
  },
  {
    slug: "meta-ai",
    name: "Meta AI",
    shortName: "Meta AI",
    color: "#A78BFA",
    description: "Meta's open-weight and consumer AI push keeps pressure on the market's pricing and distribution assumptions.",
    overview:
      "Meta AI's leverage comes from scale, open-weight influence, and its ability to seed models across consumer surfaces. It is often most important when it changes market structure rather than topping every benchmark.",
    strengths: [
      "Open-weight releases shape the broader developer ecosystem.",
      "Huge consumer distribution through Meta apps creates instant reach.",
      "Willingness to push ecosystem tools keeps pressure on closed platforms.",
    ],
    weaknesses: [
      "Enterprise sales story is less developed than rivals.",
      "Governance and compliance messaging can lag product ambition.",
      "Open releases can blur monetization narrative for investors.",
    ],
    whyItMatters:
      "Meta matters because it influences what the market expects to be open, low-cost, and widely distributed. Even when it is not leading on frontier benchmarks, it can still reshape the terms of competition.",
    valuationText: "Public company; AI spending remains a closely watched margin story inside the broader Meta business.",
    websiteUrl: "https://ai.meta.com",
    tags: ["Open-Weight", "Multimodal", "Creators"],
    products: [
      {
        name: "Llama 5 400B",
        type: "Model",
        description: "Open-weight flagship checkpoint aimed at research and enterprise fine-tuning.",
        launchDate: "2026-04-02",
      },
      {
        name: "Meta AI Assistant",
        type: "Product",
        description: "Cross-app assistant integrated into Meta's consumer surfaces.",
        launchDate: "2025-10-09",
      },
      {
        name: "Emu Studio",
        type: "Product",
        description: "Creative generation suite for branded imagery and creator workflows.",
        launchDate: "2026-01-20",
      },
      {
        name: "Llama Stack Enterprise",
        type: "Platform",
        description: "Deployment toolkit for companies running internal Llama-based services.",
        launchDate: "2026-03-31",
      },
    ],
    partnerships: [
      {
        name: "Creators Agency Network",
        detail: "Meta bundled Emu Studio and Meta AI workflows into an agency offering.",
      },
      {
        name: "Global systems integrators",
        detail: "Meta continues to lean on partners for enterprise implementation credibility.",
      },
    ],
    milestones: [
      {
        date: "2026-04-02",
        title: "Llama 5 400B ships",
        detail: "Meta reinforced its open-weight strategy with a large research-facing release.",
      },
      {
        date: "2026-03-31",
        title: "Enterprise governance toolkit launches",
        detail: "Meta tried to close one of the main objections to large-scale Llama adoption.",
      },
      {
        date: "2026-03-27",
        title: "New infrastructure chief hired",
        detail: "The company tightened AI supply chain planning ahead of the next training cycle.",
      },
      {
        date: "2026-02-19",
        title: "Emu Studio expands creator templates",
        detail: "Meta kept building the ecosystem around generative tools rather than a single model brand.",
      },
    ],
    sparkline: [3.8, 4.1, 4.4, 4.8, 5.2, 5.7, 6.1],
  },
  {
    slug: "xai",
    name: "xAI",
    shortName: "xAI",
    color: "#F0F0F5",
    description: "A fast-climbing challenger betting that speed, scale, and distribution through X can create breakout momentum.",
    overview:
      "xAI is running an aggressive playbook: train fast, ship visibly, and use the X ecosystem for instant distribution. The upside is velocity; the risk is that operational and governance gaps become more visible as the company scales.",
    strengths: [
      "Rapid iteration and willingness to move faster than most incumbents.",
      "Built-in distribution through X keeps launch awareness high.",
      "Training cluster ambition is becoming a strategic differentiator.",
    ],
    weaknesses: [
      "Governance and safety credibility are still being tested.",
      "Enterprise trust is younger than that of established rivals.",
      "Narrative swings can be sharp when product claims are scrutinized.",
    ],
    whyItMatters:
      "xAI matters because it has enough capital, compute ambition, and distribution to force the pace of the race. Even when others are skeptical, the company can still change what rivals feel pressured to ship.",
    valuationText: "Private; secondary chatter remains highly speculative but reflects aggressive growth assumptions.",
    websiteUrl: "https://x.ai",
    tags: ["Grok 5", "Training Clusters", "Agents"],
    products: [
      {
        name: "Grok 5",
        type: "Model",
        description: "Closed beta frontier model aimed at reasoning, real-time retrieval, and multimodal tasks.",
        launchDate: "2026-04-02",
      },
      {
        name: "Grok Enterprise",
        type: "Product",
        description: "Managed deployment package for customer support, analytics, and internal search.",
        launchDate: "2026-03-05",
      },
      {
        name: "Colossus Stack",
        type: "Infrastructure",
        description: "Training and inference stack built around the company's large-scale GPU clusters.",
        launchDate: "2026-01-15",
      },
      {
        name: "Grok API",
        type: "API",
        description: "Programmatic access to Grok models with retrieval and action hooks.",
        launchDate: "2026-02-22",
      },
    ],
    partnerships: [
      {
        name: "X Premium Enterprise",
        detail: "Grok automations are being sold as workflow features rather than just chat.",
      },
      {
        name: "State emergency communications pilot",
        detail: "A public-sector deal gives xAI a non-consumer reference account.",
      },
    ],
    milestones: [
      {
        date: "2026-04-02",
        title: "Grok 5 enters closed beta",
        detail: "xAI positioned the release as proof that its training scale is translating into model performance.",
      },
      {
        date: "2026-04-02",
        title: "External safety advisors announced",
        detail: "The company tried to answer the market's loudest governance question before wider release.",
      },
      {
        date: "2026-04-01",
        title: "Grok automations move into X Premium Enterprise",
        detail: "xAI expanded the path from consumer attention to paid workflow usage.",
      },
      {
        date: "2026-03-27",
        title: "New Gulf financing talks reported",
        detail: "Compute scale remains central to the xAI story and the funding needs that come with it.",
      },
    ],
    sparkline: [2.1, 2.9, 3.8, 5.2, 6.7, 8.1, 9.8],
  },
  {
    slug: "microsoft-ai",
    name: "Microsoft AI",
    shortName: "Microsoft",
    color: "#5CC7FF",
    description: "Still a crucial distribution and infrastructure force, but now under pressure to prove Copilot stickiness.",
    overview:
      "Microsoft remains central to the AI market through Azure, enterprise relationships, and its OpenAI exposure. The question in April 2026 is less whether it matters and more whether product monetization is keeping up with the scale of its strategic position.",
    strengths: [
      "Massive enterprise distribution and procurement muscle.",
      "Azure remains one of the core routes into production AI adoption.",
      "Can bundle AI into existing software contracts more easily than most rivals.",
    ],
    weaknesses: [
      "Copilot usage and churn narratives are now mixed.",
      "Its AI story can feel dependent on partners rather than self-authored.",
      "Leadership turnover around product strategy creates uncertainty.",
    ],
    whyItMatters:
      "Microsoft matters because it turns AI adoption into something large companies can actually buy, govern, and deploy. When it stumbles, it says something meaningful about how hard enterprise monetization still is.",
    valuationText: "Public company; investors are watching whether AI revenue expands faster than AI capex.",
    websiteUrl: "https://www.microsoft.com/ai",
    tags: ["Copilot", "Azure", "Enterprise"],
    products: [
      {
        name: "Copilot Enterprise",
        type: "Product",
        description: "Paid productivity assistant embedded across Microsoft 365 workflows.",
        launchDate: "2024-01-15",
      },
      {
        name: "Azure AI Foundry",
        type: "Platform",
        description: "Model, data, and orchestration layer for enterprise AI deployment.",
        launchDate: "2025-09-18",
      },
      {
        name: "Phi-4X",
        type: "Model",
        description: "Compact multimodal reasoning model optimized for Azure developers.",
        launchDate: "2026-04-01",
      },
      {
        name: "Copilot Studio",
        type: "Product",
        description: "Builder environment for enterprise automation and agent design.",
        launchDate: "2025-08-07",
      },
    ],
    partnerships: [
      {
        name: "OpenAI",
        detail: "Still central to Microsoft's frontier access story, even as pricing and compute exposure are debated.",
      },
      {
        name: "Enterprise integrators",
        detail: "Microsoft depends on partners to convert Copilot experimentation into organization-wide deployment.",
      },
    ],
    milestones: [
      {
        date: "2026-04-02",
        title: "Copilot churn concerns surface",
        detail: "Usage softness at large deployments became a major narrative risk.",
      },
      {
        date: "2026-04-01",
        title: "Phi-4X released",
        detail: "Microsoft showed it can still ship its own models with clear developer value.",
      },
      {
        date: "2026-03-30",
        title: "Reserved Azure OpenAI pricing adjusted",
        detail: "Pricing flexibility hinted at competitive pressure in large enterprise accounts.",
      },
      {
        date: "2026-03-25",
        title: "Copilot strategy executive departs",
        detail: "Leadership turnover added to questions about product direction and execution.",
      },
    ],
    sparkline: [3.5, 3.2, 2.9, 2.3, 1.1, -0.7, -2.1],
  },
  {
    slug: "amazon-aws-ai",
    name: "Amazon AWS AI",
    shortName: "Amazon AWS",
    color: "#FF9F4D",
    description: "A scale player in enterprise AI infrastructure whose challenge is holding share as models proliferate.",
    overview:
      "AWS has the cloud footprint and procurement relationships to matter in every enterprise AI conversation. The open question is whether Bedrock, Nova, and Trainium can create enough product differentiation to overcome price pressure and rival model ecosystems.",
    strengths: [
      "Deep enterprise relationships and operational trust.",
      "Infrastructure breadth across compute, storage, security, and deployment.",
      "Multi-model positioning can appeal to buyers who want flexibility.",
    ],
    weaknesses: [
      "Bedrock has not fully owned the narrative in a crowded model market.",
      "Pricing pressure is growing in competitive enterprise deals.",
      "Some of its biggest wins still depend on partner models rather than internal ones.",
    ],
    whyItMatters:
      "Amazon matters because large-scale AI deployment still runs through cloud platforms. If AWS cannot defend share with its distribution advantage, that says a lot about how the market is valuing models versus infrastructure.",
    valuationText: "Public company; AWS AI growth is increasingly discussed separately from core cloud performance.",
    websiteUrl: "https://aws.amazon.com/ai",
    tags: ["Bedrock", "Nova", "Trainium"],
    products: [
      {
        name: "Amazon Bedrock",
        type: "Platform",
        description: "Managed service for accessing foundation models with enterprise controls.",
        launchDate: "2023-09-28",
      },
      {
        name: "Nova Pro",
        type: "Model",
        description: "AWS model family focused on enterprise orchestration and multimodal usage.",
        launchDate: "2025-12-03",
      },
      {
        name: "Trainium 3",
        type: "Infrastructure",
        description: "New accelerator generation aimed at more efficient training economics.",
        launchDate: "2026-03-29",
      },
      {
        name: "Q Business",
        type: "Product",
        description: "Enterprise assistant for internal search, support, and workflow automation.",
        launchDate: "2025-07-16",
      },
    ],
    partnerships: [
      {
        name: "Anthropic",
        detail: "Expanded preferred training capacity agreement reinforces AWS as a key partner.",
      },
      {
        name: "Global systems integrators",
        detail: "AWS continues to push implementation partnerships to widen Bedrock adoption.",
      },
    ],
    milestones: [
      {
        date: "2026-04-02",
        title: "Bedrock pricing pressure reported",
        detail: "Channel checks suggested margin pressure in multi-model enterprise competitions.",
      },
      {
        date: "2026-04-03",
        title: "Nova Reasoning introduced",
        detail: "AWS responded by giving Bedrock a clearer in-house model story.",
      },
      {
        date: "2026-03-29",
        title: "Trainium 3 preview announced",
        detail: "AWS kept leaning into custom silicon as part of the AI economics debate.",
      },
      {
        date: "2026-03-31",
        title: "Q Business adds multi-agent workflows",
        detail: "AWS sharpened its pitch beyond infrastructure and into everyday enterprise automation.",
      },
    ],
    sparkline: [1.8, 1.2, 0.9, 0.2, -1.5, -3.1, -4.6],
  },
  {
    slug: "mistral",
    name: "Mistral",
    shortName: "Mistral",
    color: "#FF7A59",
    description: "Europe's strongest independent model company, pairing open posture with enterprise seriousness.",
    overview:
      "Mistral has stayed relevant by moving quickly, shipping credible enterprise products, and positioning itself as a strategic European alternative. It is especially important in government, multilingual, and sovereign AI conversations.",
    strengths: [
      "Clear European positioning helps in sovereignty-focused deals.",
      "Good mix of open posture and enterprise product discipline.",
      "Strong multilingual story and practical deployment narrative.",
    ],
    weaknesses: [
      "Compute and capital scale still trail the largest US rivals.",
      "Brand awareness is strong in tech circles but lower with mass-market audiences.",
      "Needs more flagship moments to break into the top tier of attention consistently.",
    ],
    whyItMatters:
      "Mistral matters because it is one of the few companies outside the hyperscaler sphere with a plausible shot at meaningful influence. Its progress is a signal for whether the market can support strong regional alternatives.",
    valuationText: "Private; latest market chatter suggests strategic investors are willing to pay for sovereign AI positioning.",
    websiteUrl: "https://mistral.ai",
    tags: ["Europe", "Enterprise", "Open Models"],
    products: [
      {
        name: "Mistral Large 3",
        type: "Model",
        description: "Enterprise-grade multilingual model with stricter governance controls.",
        launchDate: "2026-04-02",
      },
      {
        name: "Le Chat Enterprise",
        type: "Product",
        description: "Assistant and search workspace built for team knowledge workflows.",
        launchDate: "2025-11-11",
      },
      {
        name: "Codestral 2",
        type: "Model",
        description: "Code-focused model tuned for enterprise development environments.",
        launchDate: "2026-02-06",
      },
      {
        name: "Mistral OCR Suite",
        type: "Product",
        description: "Document parsing and retrieval stack for legal and financial teams.",
        launchDate: "2026-03-26",
      },
    ],
    partnerships: [
      {
        name: "French public sector framework",
        detail: "Mistral secured a government-facing reference win inside its home market.",
      },
      {
        name: "UAE telecom group",
        detail: "Arabic enterprise AI stack partnership expands Mistral's regional footprint.",
      },
    ],
    milestones: [
      {
        date: "2026-04-02",
        title: "Mistral Large 3 launches",
        detail: "The company positioned itself as a tighter enterprise operator, not just an open-model upstart.",
      },
      {
        date: "2026-04-02",
        title: "UAE telecom partnership lands",
        detail: "Regional enterprise expansion became part of the growth narrative.",
      },
      {
        date: "2026-03-30",
        title: "French public sector framework win",
        detail: "Mistral strengthened its sovereignty case with a concrete institutional customer.",
      },
      {
        date: "2026-03-26",
        title: "OCR suite ships",
        detail: "The company added more practical enterprise workflow tooling around its core models.",
      },
    ],
    sparkline: [0.3, 0.7, 0.9, 1.1, 1.5, 1.7, 1.9],
  },
  {
    slug: "deepseek",
    name: "DeepSeek",
    shortName: "DeepSeek",
    color: "#00D1FF",
    description: "A fast-rising open-weight contender whose cost efficiency claims keep getting attention.",
    overview:
      "DeepSeek's rise has changed the conversation about what frontier-level reasoning needs to cost. The company matters both because of its own releases and because it forces everyone else to defend performance-per-dollar.",
    strengths: [
      "Strong open-weight and research credibility with developers.",
      "Efficiency narrative resonates in a market obsessed with compute costs.",
      "Moves quickly enough to capture attention despite lower marketing scale.",
    ],
    weaknesses: [
      "Enterprise governance and documentation remain a concern for cautious buyers.",
      "Commercial infrastructure and support are still maturing.",
      "Geopolitical scrutiny can affect distribution and trust.",
    ],
    whyItMatters:
      "DeepSeek matters because it challenges the assumption that only the largest players can produce meaningful reasoning gains. Its releases affect pricing, openness, and the capital intensity story across the whole sector.",
    valuationText: "Private; valuation discussion remains opaque, with more attention on ecosystem impact than fundraising.",
    websiteUrl: "https://deepseek.com",
    tags: ["Reasoning", "Open-Weight", "Efficiency"],
    products: [
      {
        name: "DeepSeek R2",
        type: "Model",
        description: "Open-weight reasoning model optimized for strong chain-of-thought style performance.",
        launchDate: "2026-04-02",
      },
      {
        name: "DeepSeek Coder R2",
        type: "Model",
        description: "Developer model tuned for code generation, review, and repository reasoning.",
        launchDate: "2026-03-10",
      },
      {
        name: "DeepSeek Enterprise",
        type: "Product",
        description: "Managed enterprise packaging with deployment templates and governance presets.",
        launchDate: "2026-01-28",
      },
      {
        name: "DeepSeek Research Cloud",
        type: "Platform",
        description: "Cloud layer for researchers and teams fine-tuning DeepSeek models.",
        launchDate: "2026-02-17",
      },
    ],
    partnerships: [
      {
        name: "Alibaba Cloud marketplace",
        detail: "Marketplace access broadens DeepSeek's path into mainstream enterprise trials.",
      },
      {
        name: "Singapore applied research lab",
        detail: "New regional lab signals the company is investing in local ecosystems, not just model drops.",
      },
    ],
    milestones: [
      {
        date: "2026-04-02",
        title: "DeepSeek R2 released",
        detail: "The company reignited the open-weight reasoning debate with a high-attention release.",
      },
      {
        date: "2026-03-31",
        title: "Efficiency claim gains traction",
        detail: "Cost-per-token narrative amplified DeepSeek's relevance well beyond its size.",
      },
      {
        date: "2026-03-26",
        title: "Alibaba Cloud listing opens",
        detail: "Distribution into enterprise pilots became easier for regional buyers.",
      },
      {
        date: "2026-04-01",
        title: "Enterprise controls questioned",
        detail: "A third-party audit highlighted the governance work still left to do.",
      },
    ],
    sparkline: [2.7, 3.1, 3.9, 5.1, 6.4, 7.2, 8.3],
  },
  {
    slug: "nvidia",
    name: "NVIDIA",
    shortName: "NVIDIA",
    color: "#76B900",
    description: "The infrastructure backbone of the AI race, still gaining whenever model demand translates into hardware orders.",
    overview:
      "NVIDIA is not competing for end-user mindshare in the same way model labs are, but its influence runs through nearly every serious training and inference plan. It remains the clearest read on whether the AI buildout is continuing at full speed.",
    strengths: [
      "Dominant hardware and software stack for frontier AI training and inference.",
      "Can profit from competitors' arms race without choosing a single model winner.",
      "Expanding software and cloud layer broadens the revenue base beyond chips alone.",
    ],
    weaknesses: [
      "Export controls remain a persistent external risk.",
      "The market is watching closely for any slowdown in hyperscaler demand.",
      "A strong position invites more ecosystem efforts to diversify away over time.",
    ],
    whyItMatters:
      "NVIDIA matters because compute is still the limiting reagent for frontier AI. When NVIDIA's roadmap moves, the timetable for the entire field shifts with it.",
    valuationText: "Public company; hyperscaler capex expectations remain tightly linked to NVIDIA sentiment.",
    websiteUrl: "https://www.nvidia.com",
    tags: ["Chips", "Data Centers", "Robotics"],
    products: [
      {
        name: "Blackwell Ultra",
        type: "Infrastructure",
        description: "Next-wave accelerator platform shipping into major hyperscaler and cloud deployments.",
        launchDate: "2026-04-02",
      },
      {
        name: "NIM 3.0",
        type: "Platform",
        description: "Inference microservices stack for deploying models and agent workflows.",
        launchDate: "2026-03-31",
      },
      {
        name: "DGX Cloud Lepton",
        type: "Platform",
        description: "Cloud compute marketplace for enterprise and research training workloads.",
        launchDate: "2026-01-08",
      },
      {
        name: "Omniverse World Agents",
        type: "Product",
        description: "Simulation and robotics tooling for embodied AI developers.",
        launchDate: "2026-03-31",
      },
    ],
    partnerships: [
      {
        name: "Hyperscaler fleet partners",
        detail: "Blackwell Ultra shipments are tied directly to the next phase of data center expansion.",
      },
      {
        name: "Telecom edge pilot",
        detail: "A new partnership extends NVIDIA's software stack into low-latency inference deployments.",
      },
    ],
    milestones: [
      {
        date: "2026-04-02",
        title: "Blackwell Ultra racks begin shipping",
        detail: "The AI infrastructure buildout moved from promise to deployment again.",
      },
      {
        date: "2026-04-03",
        title: "Singapore capacity added",
        detail: "DGX-related marketplace expansion gave buyers more near-term compute access.",
      },
      {
        date: "2026-03-31",
        title: "NIM world-agent templates launch",
        detail: "NVIDIA kept extending from hardware supplier into platform and tooling provider.",
      },
      {
        date: "2026-03-26",
        title: "Export control debate intensifies",
        detail: "Policy risk re-entered the story even as demand stayed strong.",
      },
    ],
    sparkline: [1.1, 1.4, 1.8, 2.3, 2.9, 3.5, 4.3],
  },
];

export const newsItems: NewsItem[] = [
  {
    slug: "openai-gpt5-limited-preview",
    headline: "OpenAI opens GPT-5 limited preview to enterprise and research partners",
    sourceName: "OpenAI Newsroom",
    sourceUrl: "https://openai.com/news",
    publishedAt: "2026-04-03T08:15:00-05:00",
    summary:
      "OpenAI said GPT-5 is entering a controlled release for select enterprise customers and external research partners. The company is emphasizing stronger reasoning reliability, longer multi-step task completion, and tighter enterprise controls ahead of a wider rollout.",
    shortSummary: "GPT-5 moves from rumor to limited release.",
    whyItMatters: "This is the clearest signal yet that the next frontier cycle is starting in production, not just demos.",
    importanceScore: 10,
    importanceLevel: "Critical",
    confidenceScore: 9,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["openai"],
    categorySlugs: ["model-release"],
    tagSlugs: ["gpt-5", "reasoning", "enterprise"],
    breaking: true,
  },
  {
    slug: "anthropic-claude-4-6-opus",
    headline: "Anthropic ships Claude 4.6 Opus with longer context and steadier tool use",
    sourceName: "Anthropic",
    sourceUrl: "https://www.anthropic.com/news",
    publishedAt: "2026-04-03T07:20:00-05:00",
    summary:
      "Anthropic introduced Claude 4.6 Opus as its new high-end model for analysis, writing, and agent workflows. The launch focuses on context retention, tool reliability, and more consistent enterprise performance rather than pure benchmark theater.",
    shortSummary: "Claude 4.6 Opus lands as Anthropic's latest flagship.",
    whyItMatters: "Anthropic is trying to own the dependable-enterprise lane before GPT-5 fully opens up.",
    importanceScore: 9,
    importanceLevel: "Critical",
    confidenceScore: 9,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["anthropic"],
    categorySlugs: ["model-release"],
    tagSlugs: ["claude-4-6", "enterprise", "reasoning"],
    breaking: true,
  },
  {
    slug: "google-gemini-3-benchmark-sweep",
    headline: "Google DeepMind says Gemini 3.0 Ultra tops several reasoning benchmark suites",
    sourceName: "Google DeepMind",
    sourceUrl: "https://deepmind.google/discover/blog",
    publishedAt: "2026-04-03T06:50:00-05:00",
    summary:
      "Google DeepMind published a new batch of internal and third-party benchmark results showing Gemini 3.0 Ultra ahead on multi-step reasoning, code repair, and multimodal comprehension tasks. The company paired the claim with renewed messaging around production readiness inside Workspace and Google Cloud.",
    shortSummary: "Google claims a fresh benchmark lead for Gemini 3.0 Ultra.",
    whyItMatters: "Benchmark wins help, but Google needs those gains to translate into clearer market momentum.",
    importanceScore: 8,
    importanceLevel: "Critical",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["google-deepmind"],
    categorySlugs: ["research"],
    tagSlugs: ["gemini-3", "reasoning", "benchmarks"],
  },
  {
    slug: "xai-grok-5-closed-beta",
    headline: "xAI begins closed beta for Grok 5 after latest Colossus training cycle",
    sourceName: "xAI",
    sourceUrl: "https://x.ai/news",
    publishedAt: "2026-04-02T20:10:00-05:00",
    summary:
      "xAI said Grok 5 has entered a closed beta with external testers, following a large new training run on its Colossus cluster. The company is pitching faster reasoning, better citation behavior, and broader multimodal support as it prepares for wider release.",
    shortSummary: "Grok 5 enters testing outside xAI's walls.",
    whyItMatters: "If xAI can translate compute scale into a credible flagship model, it becomes much harder to dismiss as pure noise.",
    importanceScore: 8,
    importanceLevel: "Critical",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["xai"],
    categorySlugs: ["model-release"],
    tagSlugs: ["reasoning", "training-clusters", "multimodal"],
    breaking: true,
  },
  {
    slug: "deepseek-r2-open-weight-release",
    headline: "DeepSeek releases R2 reasoning model under an open-weight license",
    sourceName: "DeepSeek Research",
    sourceUrl: "https://deepseek.com/blog",
    publishedAt: "2026-04-02T18:40:00-05:00",
    summary:
      "DeepSeek published R2 with open weights and accompanying technical notes focused on reasoning performance and inference efficiency. Early developer response centered on whether the release can pressure the closed-model leaders on cost and transparency at the same time.",
    shortSummary: "DeepSeek pushes the open-weight reasoning race forward again.",
    whyItMatters: "R2 reinforces the idea that important reasoning gains do not have to stay inside closed commercial systems.",
    importanceScore: 8,
    importanceLevel: "Critical",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["deepseek"],
    categorySlugs: ["model-release"],
    tagSlugs: ["open-weight", "reasoning", "benchmarks"],
  },
  {
    slug: "meta-llama-5-400b-release",
    headline: "Meta publishes Llama 5 400B open-weight checkpoint for research partners",
    sourceName: "Meta AI",
    sourceUrl: "https://ai.meta.com/blog",
    publishedAt: "2026-04-02T16:05:00-05:00",
    summary:
      "Meta released a research-partner version of Llama 5 400B and positioned it as the new reference point for open large-scale model work. The company highlighted multilingual gains and stronger multimodal grounding while continuing to stress ecosystem openness.",
    shortSummary: "Meta pushes another big open-weight marker into the market.",
    whyItMatters: "Large open releases change pricing pressure and developer expectations across the entire field.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["meta-ai"],
    categorySlugs: ["model-release"],
    tagSlugs: ["open-weight", "multimodal", "reasoning"],
  },
  {
    slug: "nvidia-blackwell-ultra-shipping",
    headline: "NVIDIA says Blackwell Ultra racks have started shipping to top hyperscalers",
    sourceName: "NVIDIA",
    sourceUrl: "https://blogs.nvidia.com",
    publishedAt: "2026-04-02T14:15:00-05:00",
    summary:
      "NVIDIA said Blackwell Ultra deployments are moving from qualification into customer delivery at several large cloud and hyperscale accounts. The message was less about specs and more about real-world rack availability, which the market treats as a signal for the next capex wave.",
    shortSummary: "Blackwell Ultra moves from roadmap to actual deliveries.",
    whyItMatters: "More high-end hardware entering the market keeps the AI expansion cycle alive for every major model lab.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 9,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["nvidia"],
    categorySlugs: ["infrastructure"],
    tagSlugs: ["chips", "data-centers", "training-clusters"],
  },
  {
    slug: "mistral-large-3-enterprise-launch",
    headline: "Mistral launches Mistral Large 3 with tighter controls for enterprise buyers",
    sourceName: "Mistral",
    sourceUrl: "https://mistral.ai/news",
    publishedAt: "2026-04-02T12:10:00-05:00",
    summary:
      "Mistral introduced Mistral Large 3 with new governance settings, multilingual tuning, and deployment options aimed at more cautious large organizations. The release looked designed to prove Mistral can sell beyond the developer and sovereign-AI crowd.",
    shortSummary: "Mistral sharpens its enterprise pitch with Large 3.",
    whyItMatters: "The company needs wins like this to stay in the first conversation, not the second tier.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["mistral"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["enterprise", "multimodal", "governance"],
  },
  {
    slug: "microsoft-copilot-enterprise-churn",
    headline: "Enterprise CIO survey points to rising Copilot seat churn at large Microsoft deployments",
    sourceName: "The Information",
    sourceUrl: "https://www.theinformation.com",
    publishedAt: "2026-04-02T11:30:00-05:00",
    summary:
      "A new CIO-focused survey suggested some large organizations are trimming Copilot seat counts after initial rollouts, citing uneven usage and unclear ROI. Microsoft still has broad distribution, but this kind of reporting cuts directly at the monetization narrative around AI productivity software.",
    shortSummary: "Copilot's retention story looks less clean than Microsoft's pitch.",
    whyItMatters: "Enterprise adoption only matters if usage stays sticky after the pilot phase.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "negative",
    companySlugs: ["microsoft-ai"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["copilot", "enterprise", "pricing"],
  },
  {
    slug: "aws-bedrock-pricing-pressure",
    headline: "Channel checks suggest AWS Bedrock is facing pricing pressure in multi-model enterprise deals",
    sourceName: "Bloomberg",
    sourceUrl: "https://www.bloomberg.com",
    publishedAt: "2026-04-02T10:20:00-05:00",
    summary:
      "New channel reporting said AWS is discounting more aggressively to keep Bedrock competitive in large enterprise negotiations. That does not mean demand is weak, but it does suggest model variety and rival cloud bundling are making the sales environment tougher.",
    shortSummary: "Bedrock may be winning less cleanly than AWS would like.",
    whyItMatters: "Cloud leverage alone may not be enough if customers see models as increasingly interchangeable.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "negative",
    companySlugs: ["amazon-aws-ai"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["pricing", "enterprise", "api"],
  },
  {
    slug: "openai-oracle-stargate-expansion",
    headline: "OpenAI and Oracle expand Stargate-linked data center footprint in Texas and Virginia",
    sourceName: "Reuters",
    sourceUrl: "https://www.reuters.com",
    publishedAt: "2026-04-03T09:40:00-05:00",
    summary:
      "Reuters reported that OpenAI and Oracle are moving ahead with additional data center capacity tied to the broader Stargate buildout. The expansion points to continued confidence that frontier model demand will stay high enough to justify another step up in infrastructure commitments.",
    shortSummary: "OpenAI keeps scaling the supply side behind its model ambitions.",
    whyItMatters: "Frontier releases are only as real as the compute footprint supporting them.",
    importanceScore: 8,
    importanceLevel: "Critical",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["openai"],
    categorySlugs: ["infrastructure", "partnership"],
    tagSlugs: ["data-centers", "training-clusters", "enterprise"],
    breaking: true,
  },
  {
    slug: "anthropic-bank-rollout",
    headline: "Anthropic signs a multi-year Claude rollout with a major European retail bank",
    sourceName: "Financial Times",
    sourceUrl: "https://www.ft.com",
    publishedAt: "2026-04-02T09:00:00-05:00",
    summary:
      "Anthropic secured a broad deployment deal with a European retail bank covering analyst workflows, internal search, and customer operations. The agreement strengthens Anthropic's claim that its safety-forward posture is translating into meaningful regulated-industry demand.",
    shortSummary: "Anthropic lands another signal enterprise account.",
    whyItMatters: "Regulated-industry wins carry outsized weight because rivals also want them and buyers move slowly.",
    importanceScore: 8,
    importanceLevel: "Critical",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["anthropic"],
    categorySlugs: ["partnership"],
    tagSlugs: ["enterprise", "finance", "safety"],
  },
  {
    slug: "google-workspace-agents",
    headline: "Google adds Gemini 3 agents to Workspace with cross-app actions",
    sourceName: "Google Workspace Updates",
    sourceUrl: "https://workspaceupdates.googleblog.com",
    publishedAt: "2026-04-01T15:45:00-05:00",
    summary:
      "Google introduced Gemini-powered agents inside Workspace that can coordinate tasks across Gmail, Docs, Sheets, and Meet. The pitch is straightforward: turn Gemini from a sidebar assistant into a workflow layer that actually completes work.",
    shortSummary: "Google makes Gemini more operational inside productivity software.",
    whyItMatters: "This is the type of product translation Google needs if research wins are going to feel commercially real.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["google-deepmind"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["agents", "enterprise", "gemini-3"],
  },
  {
    slug: "xai-x-premium-automations",
    headline: "xAI packages Grok automations into X Premium Enterprise tiers",
    sourceName: "X Business",
    sourceUrl: "https://business.x.com",
    publishedAt: "2026-04-01T13:05:00-05:00",
    summary:
      "xAI folded Grok-driven automations into higher-end X business subscriptions, blending distribution, support workflows, and agent features in a single product bundle. It is an unusually direct attempt to convert audience attention into recurring software revenue.",
    shortSummary: "xAI leans harder into distribution through X.",
    whyItMatters: "If Grok can become a workflow product and not just a chatbot brand, xAI's business case gets much stronger.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["xai"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["agents", "enterprise", "api"],
  },
  {
    slug: "meta-llama-governance-toolkit",
    headline: "Meta unveils a governance toolkit for enterprise Llama deployments",
    sourceName: "Meta AI",
    sourceUrl: "https://ai.meta.com/blog",
    publishedAt: "2026-03-31T17:20:00-05:00",
    summary:
      "Meta published a new governance toolkit for enterprises building on Llama, including evaluation templates, approval workflows, and deployment checklists. The move looks aimed at a familiar problem: broad interest in open models, paired with discomfort about deploying them at scale.",
    shortSummary: "Meta tries to turn open enthusiasm into enterprise readiness.",
    whyItMatters: "Open models matter more when governance stops being the default objection.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["meta-ai"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["open-weight", "enterprise", "governance"],
  },
  {
    slug: "deepseek-r2-efficiency-claim",
    headline: "DeepSeek says R2 cuts inference cost by 32% on commodity GPU clusters",
    sourceName: "DeepSeek Research",
    sourceUrl: "https://deepseek.com/blog",
    publishedAt: "2026-03-31T12:40:00-05:00",
    summary:
      "DeepSeek published technical notes arguing that R2 can deliver a significant inference cost reduction on less specialized GPU fleets. Independent verification is still limited, but the claim is getting attention because it touches one of the market's biggest pain points.",
    shortSummary: "DeepSeek's efficiency story is becoming a core part of its appeal.",
    whyItMatters: "Cost claims can move the market even when they are not yet fully settled, because buyers are desperate for cheaper capability.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 5,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["deepseek"],
    categorySlugs: ["research"],
    tagSlugs: ["reasoning", "chips", "benchmarks"],
  },
  {
    slug: "nvidia-world-agents-templates",
    headline: "NVIDIA expands NIM 3.0 with world-agent templates for robotics labs",
    sourceName: "NVIDIA",
    sourceUrl: "https://blogs.nvidia.com",
    publishedAt: "2026-03-31T09:50:00-05:00",
    summary:
      "NVIDIA added new world-agent templates to NIM 3.0, aimed at researchers working on robotics, simulation, and embodied AI. The release continues a familiar pattern: use software tooling to pull more value out of the hardware position.",
    shortSummary: "NVIDIA keeps pushing deeper into the software layer.",
    whyItMatters: "Every software layer NVIDIA owns makes its hardware position harder to displace.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["nvidia"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["robotics", "agents", "chips"],
  },
  {
    slug: "mistral-public-sector-framework",
    headline: "Mistral wins a French public-sector language model framework contract",
    sourceName: "Les Echos",
    sourceUrl: "https://www.lesechos.fr",
    publishedAt: "2026-03-30T14:25:00-05:00",
    summary:
      "Mistral won a public-sector framework contract in France that could serve as a reference point for future sovereign AI deals in Europe. The commercial impact may build gradually, but the strategic signaling value is immediate.",
    shortSummary: "Mistral adds another sovereignty-friendly proof point.",
    whyItMatters: "Government wins help Mistral look less like a niche player and more like infrastructure for regional AI strategy.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["mistral"],
    categorySlugs: ["partnership"],
    tagSlugs: ["enterprise", "governance", "eu-ai-act"],
  },
  {
    slug: "microsoft-azure-openai-pricing",
    headline: "Microsoft trims Azure OpenAI reserved-capacity pricing to hold big accounts",
    sourceName: "CNBC",
    sourceUrl: "https://www.cnbc.com",
    publishedAt: "2026-03-30T10:05:00-05:00",
    summary:
      "Microsoft adjusted reserved-capacity pricing for some Azure OpenAI customers, according to people involved in recent renewals. The move can be read as tactical flexibility, but it also signals how hard enterprise AI contracts are becoming to defend on price alone.",
    shortSummary: "Microsoft is getting more tactical on pricing.",
    whyItMatters: "Price concessions are one of the clearest signs that competition is showing up in the real buying process.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "negative",
    companySlugs: ["microsoft-ai"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["pricing", "enterprise", "copilot"],
  },
  {
    slug: "aws-trainium-3-preview",
    headline: "AWS previews Trainium 3 instances for Bedrock-custom model training",
    sourceName: "AWS",
    sourceUrl: "https://aws.amazon.com/blogs/aws",
    publishedAt: "2026-03-29T16:00:00-05:00",
    summary:
      "AWS previewed Trainium 3 instances with a stronger efficiency pitch for customers training custom models and adapters on Bedrock. The announcement reinforces Amazon's argument that owning more of the silicon stack can help buyers control costs.",
    shortSummary: "AWS keeps making the economics case around custom silicon.",
    whyItMatters: "Infrastructure cost is still one of the easiest angles for AWS to differentiate in a crowded model market.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["amazon-aws-ai"],
    categorySlugs: ["infrastructure"],
    tagSlugs: ["chips", "data-centers", "enterprise"],
  },
  {
    slug: "openai-brussels-safety-center",
    headline: "OpenAI opens a Brussels safety and policy center ahead of the next EU AI Act phase",
    sourceName: "Politico Europe",
    sourceUrl: "https://www.politico.eu",
    publishedAt: "2026-03-29T11:15:00-05:00",
    summary:
      "OpenAI opened a Brussels office focused on safety, audits, and policy coordination as Europe prepares for a new compliance wave. The move is both regulatory housekeeping and a strategic signal that OpenAI wants to shape the rules, not just react to them.",
    shortSummary: "OpenAI invests directly in European policy capacity.",
    whyItMatters: "Policy readiness is increasingly part of the competitive moat for large AI vendors.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["openai"],
    categorySlugs: ["policy-regulation"],
    tagSlugs: ["eu-ai-act", "safety", "governance"],
  },
  {
    slug: "anthropic-constitutional-ops-toolkit",
    headline: "Anthropic launches Constitutional Ops Toolkit for regulated industries",
    sourceName: "Anthropic",
    sourceUrl: "https://www.anthropic.com/news",
    publishedAt: "2026-03-28T13:45:00-05:00",
    summary:
      "Anthropic packaged evaluation workflows, approval gates, and policy templates into a toolkit aimed at financial services, healthcare, and public-sector buyers. It is a productized answer to the question procurement teams keep asking: how do we operationalize safety claims?",
    shortSummary: "Anthropic turns governance rhetoric into something buyers can use.",
    whyItMatters: "Operational trust is becoming a product category, not just a research topic.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["anthropic"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["safety", "enterprise", "governance"],
  },
  {
    slug: "google-uk-power-agreement",
    headline: "Google signs a UK power agreement tied to a new AI training campus",
    sourceName: "Reuters",
    sourceUrl: "https://www.reuters.com",
    publishedAt: "2026-03-28T08:30:00-05:00",
    summary:
      "Google signed a long-term power arrangement in the UK to support a planned AI training campus, according to Reuters. The move underlines a broader truth about frontier AI: energy strategy is becoming product strategy.",
    shortSummary: "Google reinforces the infrastructure side of the Gemini push.",
    whyItMatters: "Reliable energy access is now a real competitive variable in model development.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["google-deepmind"],
    categorySlugs: ["infrastructure"],
    tagSlugs: ["data-centers", "training-clusters", "enterprise"],
  },
  {
    slug: "xai-gulf-data-center-financing",
    headline: "xAI explores Gulf financing for the next phase of its Colossus data center buildout",
    sourceName: "Semafor",
    sourceUrl: "https://www.semafor.com",
    publishedAt: "2026-03-27T18:10:00-05:00",
    summary:
      "Semafor reported that xAI is exploring financing conversations in the Gulf as it plans the next phase of its data center expansion. The story matters less for the exact terms today than for what it says about xAI's appetite to stay in the scale race.",
    shortSummary: "xAI's compute ambitions are pulling in more capital conversations.",
    whyItMatters: "A company betting this hard on infrastructure can quickly become more credible or more exposed.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 5,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["xai"],
    categorySlugs: ["funding", "infrastructure"],
    tagSlugs: ["training-clusters", "data-centers", "pricing"],
  },
  {
    slug: "meta-ai-infra-chief-hire",
    headline: "Meta recruits a former semiconductor supply-chain chief to run AI infra planning",
    sourceName: "The Wall Street Journal",
    sourceUrl: "https://www.wsj.com",
    publishedAt: "2026-03-27T10:35:00-05:00",
    summary:
      "Meta hired a senior operations executive with deep semiconductor supply-chain experience to oversee parts of its AI infrastructure planning. The hire suggests Meta is treating model scale and hardware logistics as a tighter integrated problem.",
    shortSummary: "Meta strengthens its operational bench around AI infrastructure.",
    whyItMatters: "Leadership hires like this signal where a company thinks its next bottleneck will be.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["meta-ai"],
    categorySlugs: ["leadership"],
    tagSlugs: ["chips", "data-centers", "governance"],
  },
  {
    slug: "deepseek-alibaba-cloud-marketplace",
    headline: "DeepSeek joins Alibaba Cloud's marketplace for enterprise pilot deployments",
    sourceName: "Alibaba Cloud",
    sourceUrl: "https://www.alibabacloud.com/blog",
    publishedAt: "2026-03-26T15:00:00-05:00",
    summary:
      "DeepSeek joined the Alibaba Cloud marketplace with packaging aimed at proof-of-concept and pilot deployments. That kind of distribution matters because it lowers the friction for buyers who are curious but not ready for a deeper platform commitment.",
    shortSummary: "DeepSeek gets an easier path into enterprise experimentation.",
    whyItMatters: "Distribution partnerships can matter as much as raw model quality for emerging players.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["deepseek"],
    categorySlugs: ["partnership"],
    tagSlugs: ["enterprise", "api", "reasoning"],
  },
  {
    slug: "nvidia-export-controls-pressure",
    headline: "US officials weigh tighter accelerator export rules that could hit some NVIDIA channels",
    sourceName: "Reuters",
    sourceUrl: "https://www.reuters.com",
    publishedAt: "2026-03-26T12:20:00-05:00",
    summary:
      "Reuters reported that US officials are considering tighter export restrictions on certain advanced accelerators, potentially affecting NVIDIA's international channel mix. Demand is still strong, but policy risk remains a live variable in the hardware story.",
    shortSummary: "Policy risk reappears in NVIDIA's otherwise strong setup.",
    whyItMatters: "Even dominant suppliers can lose momentum when geopolitics starts changing where they can ship.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "negative",
    companySlugs: ["nvidia"],
    categorySlugs: ["policy-regulation"],
    tagSlugs: ["chips", "eu-ai-act", "data-centers"],
  },
  {
    slug: "mistral-ocr-suite-launch",
    headline: "Mistral bundles multimodal OCR and retrieval tooling for legal teams",
    sourceName: "Mistral",
    sourceUrl: "https://mistral.ai/news",
    publishedAt: "2026-03-26T09:15:00-05:00",
    summary:
      "Mistral introduced a document workflow stack combining OCR, retrieval, and model orchestration for legal and compliance teams. It is a practical release meant to show that Mistral can sell outcomes, not just model endpoints.",
    shortSummary: "Mistral adds more workflow product around its models.",
    whyItMatters: "Productization is how smaller model companies prove they can convert credibility into durable revenue.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["mistral"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["multimodal", "enterprise", "api"],
  },
  {
    slug: "microsoft-copilot-strategy-exit",
    headline: "Microsoft AI's Copilot business strategy chief steps down",
    sourceName: "Business Insider",
    sourceUrl: "https://www.businessinsider.com",
    publishedAt: "2026-03-25T16:30:00-05:00",
    summary:
      "A senior Microsoft executive involved in Copilot business strategy is leaving the company, according to people familiar with the change. Leadership turnover is normal, but the timing matters because Microsoft is already dealing with questions about product retention and pricing.",
    shortSummary: "Leadership turnover adds to Microsoft's current AI pressure.",
    whyItMatters: "When the product story is wobbling, executive departures get interpreted more heavily.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "negative",
    companySlugs: ["microsoft-ai"],
    categorySlugs: ["leadership"],
    tagSlugs: ["copilot", "enterprise", "governance"],
  },
  {
    slug: "aws-anthropic-capacity-expansion",
    headline: "AWS and Anthropic expand a preferred training-capacity agreement",
    sourceName: "The Information",
    sourceUrl: "https://www.theinformation.com",
    publishedAt: "2026-03-25T13:10:00-05:00",
    summary:
      "AWS and Anthropic expanded parts of their preferred training and inference capacity arrangement, according to reporting. The deeper tie underlines how strategically valuable Anthropic has become as Bedrock and AWS search for stronger anchors in enterprise AI.",
    shortSummary: "Anthropic and AWS keep tightening an already important relationship.",
    whyItMatters: "The strongest partnerships in AI are increasingly about compute access as much as distribution.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["anthropic", "amazon-aws-ai"],
    categorySlugs: ["partnership"],
    tagSlugs: ["enterprise", "training-clusters", "pricing"],
  },
  {
    slug: "openai-sora-studio-collab",
    headline: "OpenAI rolls out Sora Studio collaboration tools for agencies and creative teams",
    sourceName: "The Verge",
    sourceUrl: "https://www.theverge.com",
    publishedAt: "2026-04-01T11:10:00-05:00",
    summary:
      "OpenAI added shared timelines, review flows, and versioned edits to Sora Studio, moving the product closer to a real production environment. The update suggests OpenAI sees generative video as a workflow business, not just a demo category.",
    shortSummary: "Sora becomes more usable by actual teams, not just solo experimenters.",
    whyItMatters: "Useful creative software can become stickier than pure model access.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["openai"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["video", "enterprise", "multimodal"],
  },
  {
    slug: "google-eu-complaint-disclosures",
    headline: "EU consumer groups file a new complaint over Gemini training disclosures",
    sourceName: "EU Observer",
    sourceUrl: "https://euobserver.com",
    publishedAt: "2026-04-02T07:55:00-05:00",
    summary:
      "Several European consumer groups filed a complaint around Google's model training disclosures and opt-out clarity, renewing a familiar tension between AI progress and compliance transparency. It is not a market-moving event by itself, but it adds friction to Google's product narrative in Europe.",
    shortSummary: "Google's regulatory overhang in Europe remains active.",
    whyItMatters: "Even when the core product is improving, compliance drag can slow adoption and messaging.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "negative",
    companySlugs: ["google-deepmind"],
    categorySlugs: ["policy-regulation"],
    tagSlugs: ["eu-ai-act", "governance", "safety"],
  },
  {
    slug: "meta-creators-agency-bundle",
    headline: "Meta signs a creators agency bundle around Meta AI and Emu Studio",
    sourceName: "Adweek",
    sourceUrl: "https://www.adweek.com",
    publishedAt: "2026-04-01T09:25:00-05:00",
    summary:
      "Meta signed a bundle deal with a creators agency network that ties Meta AI assistance and Emu Studio generation into campaign workflows. It is a reminder that some AI distribution battles will be won through vertical tools, not just benchmark charts.",
    shortSummary: "Meta leans into creator workflow distribution.",
    whyItMatters: "Distribution across existing consumer ecosystems remains one of Meta's strongest structural advantages.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["meta-ai"],
    categorySlugs: ["partnership"],
    tagSlugs: ["multimodal", "video", "enterprise"],
  },
  {
    slug: "xai-safety-advisors",
    headline: "xAI names external safety advisors as Grok 5 beta nears a wider release",
    sourceName: "Wired",
    sourceUrl: "https://www.wired.com",
    publishedAt: "2026-04-02T08:40:00-05:00",
    summary:
      "xAI announced a slate of external safety advisors ahead of the next Grok release phase. The move is partly substantive and partly narrative management, as the company tries to answer the market's biggest non-technical concern about its pace.",
    shortSummary: "xAI puts more governance structure around its next launch.",
    whyItMatters: "Governance optics matter more when a company is trying to graduate from curiosity to enterprise contender.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["xai"],
    categorySlugs: ["leadership"],
    tagSlugs: ["safety", "governance", "reasoning"],
  },
  {
    slug: "deepseek-enterprise-controls-audit",
    headline: "Independent audit flags limited documentation around DeepSeek enterprise controls",
    sourceName: "TechCrunch",
    sourceUrl: "https://techcrunch.com",
    publishedAt: "2026-04-01T07:50:00-05:00",
    summary:
      "A third-party audit of DeepSeek enterprise packaging said documentation around access controls and deployment assumptions remains light compared with larger competitors. The finding does not erase the model excitement, but it does reinforce the gap between research buzz and enterprise readiness.",
    shortSummary: "DeepSeek still has governance work to do if it wants bigger buyers.",
    whyItMatters: "Open-weight momentum becomes more durable when it can survive security review.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "negative",
    companySlugs: ["deepseek"],
    categorySlugs: ["policy-regulation"],
    tagSlugs: ["safety", "enterprise", "governance"],
  },
  {
    slug: "nvidia-singapore-capacity-expansion",
    headline: "NVIDIA-backed compute marketplace adds fresh Blackwell capacity in Singapore",
    sourceName: "Nikkei Asia",
    sourceUrl: "https://asia.nikkei.com",
    publishedAt: "2026-04-03T05:30:00-05:00",
    summary:
      "A compute marketplace tied to NVIDIA's ecosystem added new Blackwell-class capacity in Singapore for regional buyers. The move points to a broader trend: infrastructure competition is no longer only a US story.",
    shortSummary: "NVIDIA-linked capacity keeps spreading geographically.",
    whyItMatters: "New regional supply helps determine who can experiment and ship next.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["nvidia"],
    categorySlugs: ["infrastructure"],
    tagSlugs: ["chips", "data-centers", "enterprise"],
  },
  {
    slug: "aws-q-business-multi-agent",
    headline: "AWS adds multi-agent workflow orchestration to Q Business",
    sourceName: "AWS",
    sourceUrl: "https://aws.amazon.com/blogs/aws",
    publishedAt: "2026-03-31T11:00:00-05:00",
    summary:
      "AWS updated Q Business with orchestration features for multi-agent workflows spanning internal search, support, and task routing. The product push shows Amazon is trying to compete higher in the software stack rather than leaving value entirely to model vendors.",
    shortSummary: "AWS gives Q Business a stronger workflow story.",
    whyItMatters: "Owning the workflow layer could matter more than owning the best model in some enterprise accounts.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["amazon-aws-ai"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["agents", "enterprise", "api"],
  },
  {
    slug: "microsoft-phi-4x-release",
    headline: "Microsoft releases Phi-4X multimodal reasoning model for Azure developers",
    sourceName: "Microsoft",
    sourceUrl: "https://blogs.microsoft.com",
    publishedAt: "2026-04-01T14:40:00-05:00",
    summary:
      "Microsoft launched Phi-4X, a multimodal reasoning model aimed at Azure developers who want a lighter-weight option for production use. The release will not erase Copilot concerns, but it does show Microsoft still wants a more self-authored model story.",
    shortSummary: "Microsoft makes a case for its own model portfolio again.",
    whyItMatters: "Owning more of the stack gives Microsoft more ways to respond when partner dynamics get complicated.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["microsoft-ai"],
    categorySlugs: ["model-release"],
    tagSlugs: ["multimodal", "api", "reasoning"],
  },
  {
    slug: "mistral-uae-telco-partnership",
    headline: "Mistral partners with a UAE telecom group on an Arabic enterprise AI stack",
    sourceName: "Bloomberg",
    sourceUrl: "https://www.bloomberg.com",
    publishedAt: "2026-04-02T13:25:00-05:00",
    summary:
      "Bloomberg reported that Mistral has partnered with a UAE telecom group to build Arabic-language enterprise AI services. The deal expands Mistral's regional relevance and supports its pitch as a flexible alternative to the biggest US platforms.",
    shortSummary: "Mistral broadens its enterprise footprint beyond Europe.",
    whyItMatters: "Regional wins are how challengers build real commercial gravity before they win global headlines.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["mistral"],
    categorySlugs: ["partnership"],
    tagSlugs: ["enterprise", "multimodal", "governance"],
  },
  {
    slug: "anthropic-deceptive-reasoning-evals",
    headline: "Anthropic publishes a new eval framework for deceptive reasoning behavior",
    sourceName: "Anthropic",
    sourceUrl: "https://www.anthropic.com/research",
    publishedAt: "2026-04-01T10:45:00-05:00",
    summary:
      "Anthropic published a new evaluation framework focused on deceptive reasoning and agent behavior under pressure. It is the kind of release that reinforces the company's research identity even when the commercial headlines are louder.",
    shortSummary: "Anthropic keeps investing visibly in safety research.",
    whyItMatters: "Research credibility is part of how Anthropic wins trust with cautious buyers and policymakers.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["anthropic"],
    categorySlugs: ["research"],
    tagSlugs: ["safety", "reasoning", "governance"],
  },
  {
    slug: "openai-inference-systems-hire",
    headline: "OpenAI hires a former Apple silicon leader for inference systems work",
    sourceName: "The Information",
    sourceUrl: "https://www.theinformation.com",
    publishedAt: "2026-03-31T08:20:00-05:00",
    summary:
      "OpenAI hired a senior engineering leader with deep chip and systems background to help improve inference efficiency. The move points to a broader shift across the frontier labs: model capability is no longer enough if delivery economics stay too heavy.",
    shortSummary: "OpenAI adds more hardware and systems depth.",
    whyItMatters: "Inference efficiency is becoming a first-order product and margin question for leading labs.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["openai"],
    categorySlugs: ["leadership"],
    tagSlugs: ["chips", "data-centers", "governance"],
  },
  {
    slug: "google-gemini-long-context-pricing",
    headline: "Google cuts Gemini API pricing for long-context tiers",
    sourceName: "Google Cloud",
    sourceUrl: "https://cloud.google.com/blog",
    publishedAt: "2026-03-31T16:40:00-05:00",
    summary:
      "Google reduced pricing on some Gemini API long-context tiers, sharpening its case with developers building retrieval-heavy and document-heavy applications. Price moves like this are a reminder that model competition is now very much an economic contest too.",
    shortSummary: "Google gets more aggressive where developer bills get big.",
    whyItMatters: "Pricing changes are one of the fastest ways companies can convert technical progress into actual adoption.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["google-deepmind"],
    categorySlugs: ["product-launch"],
    tagSlugs: ["pricing", "api", "enterprise"],
  },
  {
    slug: "meta-ai-labeling-updates",
    headline: "Meta updates AI content-labeling tools to align with tougher EU guidelines",
    sourceName: "Meta Policy",
    sourceUrl: "https://about.fb.com/news",
    publishedAt: "2026-03-31T13:15:00-05:00",
    summary:
      "Meta rolled out new content-labeling and provenance settings for AI-generated media in Europe. The update is practical rather than flashy, but it helps Meta show it is taking distribution risk and compliance pressure seriously.",
    shortSummary: "Meta leans into product-level compliance changes.",
    whyItMatters: "Companies with giant consumer surfaces cannot treat policy as a side issue anymore.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["meta-ai"],
    categorySlugs: ["policy-regulation"],
    tagSlugs: ["eu-ai-act", "safety", "video"],
  },
  {
    slug: "microsoft-openai-compute-review",
    headline: "Microsoft reviews OpenAI compute exposure as enterprise demand mix shifts",
    sourceName: "Bloomberg",
    sourceUrl: "https://www.bloomberg.com",
    publishedAt: "2026-03-31T18:05:00-05:00",
    summary:
      "Bloomberg reported that Microsoft has been reviewing how much long-term compute exposure it wants to carry as enterprise demand shifts across products and pricing bands. The review does not imply a rupture, but it does show the partnership is entering a more mature and negotiated phase.",
    shortSummary: "The Microsoft-OpenAI relationship is still central, but more complex.",
    whyItMatters: "The market watches this partnership closely because it shapes both frontier access and enterprise distribution.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "neutral",
    companySlugs: ["microsoft-ai", "openai"],
    categorySlugs: ["partnership"],
    tagSlugs: ["enterprise", "pricing", "training-clusters"],
  },
  {
    slug: "aws-nova-reasoning-family",
    headline: "AWS launches Nova Reasoning model family for Bedrock customers",
    sourceName: "AWS",
    sourceUrl: "https://aws.amazon.com/blogs/aws",
    publishedAt: "2026-04-03T06:25:00-05:00",
    summary:
      "AWS introduced a new Nova Reasoning family aimed at customers who want an in-house Bedrock option for structured analysis and agent flows. The launch is as much about narrative as product: Bedrock needs more reasons for customers to start with AWS, not just stay there.",
    shortSummary: "AWS gives Bedrock a more concrete homegrown model story.",
    whyItMatters: "Owning more model IP could help AWS defend margin and reduce dependence on partners over time.",
    importanceScore: 7,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["amazon-aws-ai"],
    categorySlugs: ["model-release"],
    tagSlugs: ["reasoning", "api", "enterprise"],
  },
  {
    slug: "xai-public-sector-pilot",
    headline: "xAI wins a state emergency communications pilot for agent-assisted triage",
    sourceName: "VentureBeat",
    sourceUrl: "https://venturebeat.com",
    publishedAt: "2026-03-30T12:50:00-05:00",
    summary:
      "xAI won a public-sector pilot focused on agent-assisted communications triage during emergency events. The deal is small in pure revenue terms, but it gives xAI a more serious case study than social buzz alone.",
    shortSummary: "xAI adds a practical public-sector reference point.",
    whyItMatters: "Real deployments are how fast-moving challengers start building institutional credibility.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["xai"],
    categorySlugs: ["partnership"],
    tagSlugs: ["agents", "enterprise", "governance"],
  },
  {
    slug: "deepseek-singapore-research-lab",
    headline: "DeepSeek opens a Singapore applied research lab focused on enterprise deployment",
    sourceName: "Straits Times",
    sourceUrl: "https://www.straitstimes.com",
    publishedAt: "2026-03-30T09:10:00-05:00",
    summary:
      "DeepSeek opened an applied research lab in Singapore to work more closely with enterprise and regional partners. The move gives the company a broader face than pure model release cycles and hints at a more durable regional footprint.",
    shortSummary: "DeepSeek starts looking more like an institution, not just a lab.",
    whyItMatters: "Geographic expansion can make fast-rising companies feel more credible to enterprise buyers.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 7,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["deepseek"],
    categorySlugs: ["infrastructure", "leadership"],
    tagSlugs: ["enterprise", "data-centers", "governance"],
  },
  {
    slug: "nvidia-telco-edge-pilot",
    headline: "NVIDIA and a telecom partner pilot an edge inference stack for autonomous support agents",
    sourceName: "Light Reading",
    sourceUrl: "https://www.lightreading.com",
    publishedAt: "2026-03-30T08:45:00-05:00",
    summary:
      "NVIDIA and a telecom partner are piloting an edge inference setup designed for customer support and operations agents. The point is not just the pilot itself, but the continued spread of NVIDIA's software stack into new operational contexts.",
    shortSummary: "NVIDIA keeps extending beyond centralized training economics.",
    whyItMatters: "Broader deployment modes expand the company's influence beyond hyperscaler spending cycles.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 6,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["nvidia"],
    categorySlugs: ["partnership"],
    tagSlugs: ["agents", "chips", "enterprise"],
  },
  {
    slug: "mistral-strategic-extension-rumor",
    headline: "Mistral is said to be closing a strategic extension at a higher valuation",
    sourceName: "Financial Times",
    sourceUrl: "https://www.ft.com",
    publishedAt: "2026-03-29T09:05:00-05:00",
    summary:
      "The Financial Times reported that Mistral is in late talks on a strategic financing extension at a higher implied valuation. Nothing is finalized, but the report suggests investors still want exposure to credible regional AI players with enterprise traction.",
    shortSummary: "Funding interest in Mistral appears to remain strong.",
    whyItMatters: "Capital access determines whether independent model companies can keep pace on compute and hiring.",
    importanceScore: 6,
    importanceLevel: "Notable",
    confidenceScore: 5,
    confidenceLevel: "Medium",
    impactDirection: "positive",
    companySlugs: ["mistral"],
    categorySlugs: ["funding"],
    tagSlugs: ["enterprise", "pricing", "governance"],
  },
  {
    slug: "anthropic-red-team-hub",
    headline: "Anthropic opens a shared red-team hub with a university consortium",
    sourceName: "Anthropic",
    sourceUrl: "https://www.anthropic.com/news",
    publishedAt: "2026-03-29T10:25:00-05:00",
    summary:
      "Anthropic launched a shared red-team program with a consortium of universities to test model failure modes and agent behavior. The initiative is a research move, but also a branding one: Anthropic wants safety work to feel operational and ongoing.",
    shortSummary: "Anthropic keeps tying research credibility to public process.",
    whyItMatters: "Public trust in AI vendors increasingly depends on visible testing, not just published principles.",
    importanceScore: 5,
    importanceLevel: "Notable",
    confidenceScore: 8,
    confidenceLevel: "High",
    impactDirection: "positive",
    companySlugs: ["anthropic"],
    categorySlugs: ["research", "partnership"],
    tagSlugs: ["safety", "governance", "reasoning"],
  },
];

export const launches: LaunchCardData[] = [
  {
    slug: "gpt-5-limited-preview",
    type: "MODEL",
    name: "GPT-5 Limited Preview",
    companySlug: "openai",
    description: "Controlled rollout focused on reasoning reliability, long tasks, and enterprise safety controls.",
    launchDate: "2026-04-03",
    accent: "blue",
  },
  {
    slug: "claude-4-6-opus",
    type: "MODEL",
    name: "Claude 4.6 Opus",
    companySlug: "anthropic",
    description: "High-end model aimed at steadier long-context analysis and tool orchestration.",
    launchDate: "2026-04-03",
    accent: "green",
  },
  {
    slug: "gemini-workspace-agents",
    type: "PRODUCT",
    name: "Gemini Workspace Agents",
    companySlug: "google-deepmind",
    description: "Cross-app agent actions inside Docs, Sheets, Gmail, and Meet.",
    launchDate: "2026-04-01",
    accent: "amber",
  },
  {
    slug: "llama-5-400b",
    type: "MODEL",
    name: "Llama 5 400B",
    companySlug: "meta-ai",
    description: "Research-partner open-weight checkpoint with stronger multilingual and multimodal behavior.",
    launchDate: "2026-04-02",
    accent: "purple",
  },
  {
    slug: "grok-5-beta",
    type: "MODEL",
    name: "Grok 5 Closed Beta",
    companySlug: "xai",
    description: "xAI's newest flagship beta with broader multimodal support and faster reasoning.",
    launchDate: "2026-04-02",
    accent: "blue",
  },
  {
    slug: "nova-reasoning",
    type: "API",
    name: "Nova Reasoning",
    companySlug: "amazon-aws-ai",
    description: "In-house reasoning family built to strengthen the Bedrock stack.",
    launchDate: "2026-04-03",
    accent: "green",
  },
];

export const momentumEvents: MomentumEvent[] = [
  {
    companySlug: "openai",
    newsSlug: "openai-gpt5-limited-preview",
    eventType: "Major model release",
    scoreDelta: 10,
    eventDate: "2026-04-03T08:15:00-05:00",
    explanation: "GPT-5 preview is the clearest single capability milestone of the week.",
  },
  {
    companySlug: "openai",
    newsSlug: "openai-oracle-stargate-expansion",
    eventType: "Infrastructure expansion",
    scoreDelta: 6,
    eventDate: "2026-04-03T09:40:00-05:00",
    explanation: "Additional data center capacity reinforces OpenAI's ability to scale frontier demand.",
  },
  {
    companySlug: "anthropic",
    newsSlug: "anthropic-claude-4-6-opus",
    eventType: "Major model release",
    scoreDelta: 10,
    eventDate: "2026-04-03T07:20:00-05:00",
    explanation: "Claude 4.6 Opus keeps Anthropic in the top tier of current model launches.",
  },
  {
    companySlug: "anthropic",
    newsSlug: "anthropic-bank-rollout",
    eventType: "Enterprise partnership",
    scoreDelta: 7,
    eventDate: "2026-04-02T09:00:00-05:00",
    explanation: "A regulated-industry bank rollout is high-signal commercial validation.",
  },
  {
    companySlug: "google-deepmind",
    newsSlug: "google-gemini-3-benchmark-sweep",
    eventType: "Benchmark claim",
    scoreDelta: 3,
    eventDate: "2026-04-03T06:50:00-05:00",
    explanation: "Gemini benchmark wins help narrative momentum even before market share shifts.",
  },
  {
    companySlug: "google-deepmind",
    newsSlug: "google-workspace-agents",
    eventType: "Major product launch",
    scoreDelta: 8,
    eventDate: "2026-04-01T15:45:00-05:00",
    explanation: "Workspace agents translate research into a product surface millions already use.",
  },
  {
    companySlug: "xai",
    newsSlug: "xai-grok-5-closed-beta",
    eventType: "Major model release",
    scoreDelta: 10,
    eventDate: "2026-04-02T20:10:00-05:00",
    explanation: "Grok 5 beta is xAI's strongest bid yet to be treated as a serious frontier lab.",
  },
  {
    companySlug: "deepseek",
    newsSlug: "deepseek-r2-open-weight-release",
    eventType: "Major model release",
    scoreDelta: 10,
    eventDate: "2026-04-02T18:40:00-05:00",
    explanation: "DeepSeek R2 reignites the open-weight reasoning debate with strong developer attention.",
  },
  {
    companySlug: "meta-ai",
    newsSlug: "meta-llama-5-400b-release",
    eventType: "Major model release",
    scoreDelta: 10,
    eventDate: "2026-04-02T16:05:00-05:00",
    explanation: "Llama 5 400B keeps Meta central to the open-weight conversation.",
  },
  {
    companySlug: "nvidia",
    newsSlug: "nvidia-blackwell-ultra-shipping",
    eventType: "Infrastructure expansion",
    scoreDelta: 6,
    eventDate: "2026-04-02T14:15:00-05:00",
    explanation: "Actual Blackwell Ultra shipments are one of the strongest possible infrastructure signals.",
  },
  {
    companySlug: "mistral",
    newsSlug: "mistral-large-3-enterprise-launch",
    eventType: "Major product launch",
    scoreDelta: 8,
    eventDate: "2026-04-02T12:10:00-05:00",
    explanation: "Mistral Large 3 is a needed proof point that the company can keep shipping for enterprise buyers.",
  },
  {
    companySlug: "microsoft-ai",
    newsSlug: "microsoft-copilot-enterprise-churn",
    eventType: "Controversy",
    scoreDelta: -4,
    eventDate: "2026-04-02T11:30:00-05:00",
    explanation: "Copilot churn reporting hits directly at Microsoft's AI monetization story.",
  },
  {
    companySlug: "amazon-aws-ai",
    newsSlug: "aws-bedrock-pricing-pressure",
    eventType: "Controversy",
    scoreDelta: -4,
    eventDate: "2026-04-02T10:20:00-05:00",
    explanation: "Price pressure weakens the view that AWS can lean on cloud scale alone.",
  },
  {
    companySlug: "nvidia",
    newsSlug: "nvidia-export-controls-pressure",
    eventType: "Regulatory setback",
    scoreDelta: -6,
    eventDate: "2026-03-26T12:20:00-05:00",
    explanation: "Export rule uncertainty puts a meaningful policy drag on otherwise strong infrastructure demand.",
  },
  {
    companySlug: "anthropic",
    newsSlug: "anthropic-constitutional-ops-toolkit",
    eventType: "Major product launch",
    scoreDelta: 8,
    eventDate: "2026-03-28T13:45:00-05:00",
    explanation: "Governance productization strengthens Anthropic's enterprise positioning beyond the core model line.",
  },
];

export const momentumSnapshots: MomentumSnapshot[] = [
  {
    companySlug: "openai",
    rank: 1,
    score: 18.4,
    scoreChange24h: 4.9,
    scoreChange7d: 8.2,
    trend: "↑↑",
    keyDriver: "GPT-5 limited preview rolls out",
    sparkline: [8.2, 9.1, 10.7, 12.5, 14.1, 16.2, 18.4],
    driverNewsSlugs: ["openai-gpt5-limited-preview", "openai-oracle-stargate-expansion"],
  },
  {
    companySlug: "anthropic",
    rank: 2,
    score: 14.7,
    scoreChange24h: 3.5,
    scoreChange7d: 6.4,
    trend: "↑",
    keyDriver: "Claude 4.6 Opus ships, enterprise demand rises",
    sparkline: [6.4, 7.1, 8.4, 9.6, 11.3, 12.8, 14.7],
    driverNewsSlugs: ["anthropic-claude-4-6-opus", "anthropic-bank-rollout"],
  },
  {
    companySlug: "google-deepmind",
    rank: 3,
    score: 11.2,
    scoreChange24h: 2.3,
    scoreChange7d: 4.8,
    trend: "↑",
    keyDriver: "Gemini 3.0 Ultra benchmark wins combine with Workspace agents",
    sparkline: [4.8, 5.2, 6.1, 7.2, 8.9, 10.1, 11.2],
    driverNewsSlugs: ["google-gemini-3-benchmark-sweep", "google-workspace-agents"],
  },
  {
    companySlug: "xai",
    rank: 4,
    score: 9.8,
    scoreChange24h: 3,
    scoreChange7d: 5.5,
    trend: "↑",
    keyDriver: "Grok 5 enters closed beta with stronger governance messaging",
    sparkline: [2.3, 3.1, 4.2, 5.8, 7.1, 8.4, 9.8],
    driverNewsSlugs: ["xai-grok-5-closed-beta", "xai-safety-advisors"],
  },
  {
    companySlug: "deepseek",
    rank: 5,
    score: 8.3,
    scoreChange24h: 2.7,
    scoreChange7d: 4.9,
    trend: "↑",
    keyDriver: "R2 open-weight release resets the efficiency conversation",
    sparkline: [2.7, 3.3, 4.1, 5.4, 6.2, 7.1, 8.3],
    driverNewsSlugs: ["deepseek-r2-open-weight-release", "deepseek-r2-efficiency-claim"],
  },
  {
    companySlug: "meta-ai",
    rank: 6,
    score: 6.1,
    scoreChange24h: 0.6,
    scoreChange7d: 1.7,
    trend: "→",
    keyDriver: "Llama 5 400B keeps Meta central to open-weight adoption",
    sparkline: [3.9, 4.1, 4.3, 4.8, 5.2, 5.7, 6.1],
    driverNewsSlugs: ["meta-llama-5-400b-release", "meta-llama-governance-toolkit"],
  },
  {
    companySlug: "nvidia",
    rank: 7,
    score: 4.3,
    scoreChange24h: 0.9,
    scoreChange7d: 2.8,
    trend: "→",
    keyDriver: "Blackwell Ultra shipments offset policy noise",
    sparkline: [1.2, 1.5, 2, 2.6, 3.1, 3.7, 4.3],
    driverNewsSlugs: ["nvidia-blackwell-ultra-shipping", "nvidia-singapore-capacity-expansion"],
  },
  {
    companySlug: "mistral",
    rank: 8,
    score: 1.9,
    scoreChange24h: 0.4,
    scoreChange7d: 1.3,
    trend: "→",
    keyDriver: "Large 3 gives Mistral another enterprise proof point",
    sparkline: [0.1, 0.4, 0.7, 1, 1.4, 1.7, 1.9],
    driverNewsSlugs: ["mistral-large-3-enterprise-launch", "mistral-uae-telco-partnership"],
  },
  {
    companySlug: "microsoft-ai",
    rank: 9,
    score: -2.1,
    scoreChange24h: -1.4,
    scoreChange7d: -3.2,
    trend: "↓",
    keyDriver: "Copilot Enterprise churn concerns outweigh Phi-4X momentum",
    sparkline: [2.8, 2.1, 1.4, 0.8, 0, -1.3, -2.1],
    driverNewsSlugs: ["microsoft-copilot-enterprise-churn", "microsoft-copilot-strategy-exit"],
  },
  {
    companySlug: "amazon-aws-ai",
    rank: 10,
    score: -4.6,
    scoreChange24h: -1.8,
    scoreChange7d: -4.1,
    trend: "↓",
    keyDriver: "Bedrock market share pressure weighs on AWS's AI narrative",
    sparkline: [1.3, 0.4, -0.2, -1.1, -2.4, -3.5, -4.6],
    driverNewsSlugs: ["aws-bedrock-pricing-pressure", "aws-nova-reasoning-family"],
  },
];

export const timelineEntries: TimelineEntry[] = [
  {
    slug: "timeline-openai-gpt5",
    companySlug: "openai",
    timestamp: "2026-04-03T08:15:00-05:00",
    headline: "OpenAI opens GPT-5 limited preview",
    detail: "Enterprise customers and research partners get first access ahead of a broader launch.",
    live: true,
  },
  {
    slug: "timeline-openai-oracle",
    companySlug: "openai",
    timestamp: "2026-04-03T09:40:00-05:00",
    headline: "Stargate-linked footprint expands again",
    detail: "New Texas and Virginia capacity suggests OpenAI is still scaling for a bigger release wave.",
  },
  {
    slug: "timeline-anthropic-claude",
    companySlug: "anthropic",
    timestamp: "2026-04-03T07:20:00-05:00",
    headline: "Claude 4.6 Opus ships",
    detail: "Anthropic bets that steadier enterprise behavior matters more than maximum hype.",
  },
  {
    slug: "timeline-google-gemini",
    companySlug: "google-deepmind",
    timestamp: "2026-04-03T06:50:00-05:00",
    headline: "Google touts Gemini 3.0 benchmark sweep",
    detail: "The company is trying to turn research wins into clearer commercial momentum.",
  },
  {
    slug: "timeline-nvidia-capacity",
    companySlug: "nvidia",
    timestamp: "2026-04-03T05:30:00-05:00",
    headline: "Blackwell capacity expands into Singapore",
    detail: "Regional supply growth keeps infrastructure pressure from staying purely US-centric.",
  },
  {
    slug: "timeline-xai-grok",
    companySlug: "xai",
    timestamp: "2026-04-02T20:10:00-05:00",
    headline: "Grok 5 enters closed beta",
    detail: "xAI makes its strongest case yet that its compute buildout is turning into product progress.",
  },
  {
    slug: "timeline-deepseek-r2",
    companySlug: "deepseek",
    timestamp: "2026-04-02T18:40:00-05:00",
    headline: "DeepSeek releases R2",
    detail: "Another open-weight reasoning milestone lands with strong developer attention.",
  },
  {
    slug: "timeline-meta-llama",
    companySlug: "meta-ai",
    timestamp: "2026-04-02T16:05:00-05:00",
    headline: "Meta publishes Llama 5 400B",
    detail: "The open-weight race gets another major checkpoint from a player with enormous reach.",
  },
  {
    slug: "timeline-mistral-partnership",
    companySlug: "mistral",
    timestamp: "2026-04-02T13:25:00-05:00",
    headline: "Mistral broadens with a UAE telecom partner",
    detail: "Regional enterprise expansion supports the case that Mistral can scale beyond Europe.",
  },
  {
    slug: "timeline-microsoft-churn",
    companySlug: "microsoft-ai",
    timestamp: "2026-04-02T11:30:00-05:00",
    headline: "Copilot churn questions hit Microsoft",
    detail: "The market is being reminded that enterprise AI rollouts do not stay sticky by default.",
  },
];

export const trendingTopics: TrendingTopic[] = [
  { label: "GPT-5 Launch", hot: true },
  { label: "Open-Weight Models", hot: true },
  { label: "AI Regulation EU" },
  { label: "Chip Export Controls" },
  { label: "AI Agents", hot: true },
  { label: "Reasoning Models", hot: true },
  { label: "AI Infrastructure Buildout" },
  { label: "Synthetic Data" },
  { label: "Enterprise AI Adoption" },
  { label: "AI Safety Frameworks" },
];

export const topMovers: TopMover[] = [
  {
    label: "Biggest Gainer",
    companySlug: "openai",
    delta: 14.2,
    reason: "GPT-5 preview plus fresh Stargate capacity gave OpenAI the strongest 24-hour burst on the board.",
    accent: "green",
    chart: [3.2, 4.4, 5.1, 6.7, 8.9, 11.8, 14.2],
  },
  {
    label: "Biggest Drop",
    companySlug: "amazon-aws-ai",
    delta: -6.3,
    reason: "Bedrock pricing pressure is overshadowing AWS's otherwise strong infrastructure position.",
    accent: "red",
    chart: [3.4, 2.8, 1.4, 0.9, -1.2, -3.8, -6.3],
  },
  {
    label: "One To Watch",
    companySlug: "deepseek",
    delta: 7.6,
    reason: "R2 has real open-weight momentum, but enterprise readiness questions are still unresolved.",
    accent: "purple",
    chart: [1.6, 2.1, 2.8, 4.5, 5.1, 6.6, 7.6],
  },
];

export const dailyDigest: DailyDigest = {
  date: "2026-04-03",
  title: "The AI Race Daily Digest",
  summary:
    "April 3 was a genuine leaderboard day. OpenAI turned months of anticipation into a GPT-5 preview, Anthropic answered with Claude 4.6 Opus, and Google kept pushing Gemini's benchmark case while trying to make that progress visible inside products people already use. The challengers did not disappear either: xAI's Grok 5 beta kept its momentum story alive, DeepSeek forced the open-weight conversation forward again, and AWS tried to reset its footing with a new Nova Reasoning family. The biggest theme underneath all of it was simple: capability matters, but distribution, infrastructure, and enterprise trust are deciding who actually converts attention into durable advantage.",
  biggestWinnerCompanySlug: "openai",
  biggestLoserCompanySlug: "microsoft-ai",
  mostImportantNewsSlug: "openai-gpt5-limited-preview",
  topStorySlugs: [
    "openai-gpt5-limited-preview",
    "anthropic-claude-4-6-opus",
    "openai-oracle-stargate-expansion",
    "google-gemini-3-benchmark-sweep",
    "aws-nova-reasoning-family",
    "xai-grok-5-closed-beta",
    "deepseek-r2-open-weight-release",
    "meta-llama-5-400b-release",
    "nvidia-blackwell-ultra-shipping",
    "microsoft-copilot-enterprise-churn",
  ],
  watchNext: [
    "Whether OpenAI expands GPT-5 access beyond the current controlled preview cohort.",
    "How enterprise buyers react to Claude 4.6 Opus versus GPT-5 in the next renewal cycle.",
    "Whether AWS can use Nova Reasoning to stabilize the Bedrock narrative before pricing pressure deepens.",
  ],
};

export const homeTickerItems = [
  { company: "OPENAI", direction: "↑", tone: "green" as const, text: "GPT-5 launch imminent" },
  { company: "ANTHROPIC", direction: "↑", tone: "green" as const, text: "Claude 4.6 Opus ships" },
  { company: "GOOGLE", direction: "↗", tone: "blue" as const, text: "Gemini 3.0 benchmark sweep" },
  { company: "META", direction: "→", tone: "neutral" as const, text: "Llama 5 open-weight release" },
  { company: "xAI", direction: "↑", tone: "green" as const, text: "Grok 5 training complete" },
  { company: "DEEPSEEK", direction: "↑", tone: "green" as const, text: "R2 reasoning model released" },
];

export const homePageConfig = {
  todayStorySlugs: [
    "openai-gpt5-limited-preview",
    "anthropic-claude-4-6-opus",
    "openai-oracle-stargate-expansion",
    "google-gemini-3-benchmark-sweep",
    "aws-nova-reasoning-family",
  ],
  breakingStorySlugs: [
    "openai-gpt5-limited-preview",
    "anthropic-claude-4-6-opus",
    "openai-oracle-stargate-expansion",
  ],
  leaderboardPreviewCount: 10,
  launchSlugs: launches.map((launch) => launch.slug),
};

export const companiesBySlug = Object.fromEntries(companies.map((company) => [company.slug, company])) as Record<
  string,
  CompanyProfile
>;

export const categoriesBySlug = Object.fromEntries(
  categories.map((category) => [category.slug, category]),
) as Record<string, NewsCategory>;

export const tagsBySlug = Object.fromEntries(tags.map((tag) => [tag.slug, tag])) as Record<string, NewsTag>;

export const newsItemsBySlug = Object.fromEntries(newsItems.map((item) => [item.slug, item])) as Record<string, NewsItem>;

export const sortedNewsItems = [...newsItems].sort(
  (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
);

export const companyActivityCounts = Object.fromEntries(
  companies.map((company) => [
    company.slug,
    newsItems.filter((item) => item.companySlugs.includes(company.slug)).length,
  ]),
) as Record<string, number>;

export function getCompanyBySlug(slug: string) {
  return companiesBySlug[slug];
}

export function getCompanyNews(slug: string) {
  return sortedNewsItems.filter((item) => item.companySlugs.includes(slug));
}

export function getCompanyMomentum(slug: string) {
  return momentumSnapshots.find((snapshot) => snapshot.companySlug === slug);
}

export function getCompanyLaunches(slug: string) {
  return launches.filter((launch) => launch.companySlug === slug);
}

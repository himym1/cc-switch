export const PI_AGENT_DEFAULT_PROVIDER_ID = "custom";
export const PI_AGENT_DEFAULT_MODEL_ID = "gpt-5.1";

export const PI_AGENT_API_PROTOCOLS = [
  { value: "openai-completions", label: "OpenAI Completions" },
  { value: "openai-responses", label: "OpenAI Responses" },
  { value: "anthropic-messages", label: "Anthropic Messages" },
  { value: "google-generative-ai", label: "Google Generative AI" },
  { value: "bedrock-converse-stream", label: "AWS Bedrock" },
] as const;

export const PI_AGENT_DEFAULT_CONFIG = JSON.stringify(
  {
    models: {
      providers: {
        [PI_AGENT_DEFAULT_PROVIDER_ID]: {
          baseUrl: "",
          api: "openai-completions",
          apiKey: "",
          models: [{ id: PI_AGENT_DEFAULT_MODEL_ID }],
        },
      },
    },
    settings: {
      defaultProvider: PI_AGENT_DEFAULT_PROVIDER_ID,
      defaultModel: PI_AGENT_DEFAULT_MODEL_ID,
    },
  },
  null,
  2,
);

export interface PiAgentFormValues {
  providerId: string;
  baseUrl: string;
  apiKey: string;
  api: string;
  defaultModel: string;
  contextWindow: string;
  maxTokens: string;
}

const isRecord = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseJsonObject = (jsonString: string): Record<string, any> => {
  try {
    const parsed = JSON.parse(jsonString || "{}");
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const getProviders = (config: Record<string, any>): Record<string, any> => {
  const providers = config.models?.providers;
  return isRecord(providers) ? providers : {};
};

const getProviderId = (config: Record<string, any>): string => {
  const providers = getProviders(config);
  const configured = config.settings?.defaultProvider;
  if (typeof configured === "string" && isRecord(providers[configured])) {
    return configured;
  }
  const first = Object.entries(providers).find(([, value]) => isRecord(value));
  return first?.[0] ?? PI_AGENT_DEFAULT_PROVIDER_ID;
};

const getProvider = (config: Record<string, any>, providerId: string) => {
  const provider = getProviders(config)[providerId];
  return isRecord(provider) ? provider : {};
};

const getFirstModelId = (provider: Record<string, any>): string => {
  const first = Array.isArray(provider.models) ? provider.models[0] : undefined;
  if (isRecord(first) && typeof first.id === "string") return first.id;
  return "";
};

const getModel = (
  provider: Record<string, any>,
  modelId: string,
): Record<string, any> => {
  if (!Array.isArray(provider.models)) return {};
  const selected = provider.models.find(
    (model: unknown) => isRecord(model) && model.id === modelId,
  );
  return isRecord(selected) ? selected : {};
};

const getPositiveIntegerString = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value));
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return value.trim();
  }
  return "";
};

const findOrCreateModel = (
  provider: Record<string, any>,
  modelId: string,
): Record<string, any> | null => {
  if (!modelId) return null;
  if (!Array.isArray(provider.models)) provider.models = [];

  const existing = provider.models.find(
    (model: unknown) => isRecord(model) && model.id === modelId,
  );
  if (isRecord(existing)) return existing;

  const created = { id: modelId };
  provider.models.push(created);
  return created;
};

const applyPositiveIntegerUpdate = (
  model: Record<string, any> | null,
  field: "contextWindow" | "maxTokens",
  value: string | undefined,
) => {
  if (!model || value === undefined) return;

  const trimmed = value.trim();
  if (!trimmed) {
    delete model[field];
    return;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    model[field] = parsed;
  }
};

const ensureCompat = (model: Record<string, any>): Record<string, any> => {
  if (!isRecord(model.compat)) model.compat = {};
  return model.compat;
};

const normalizePiAgentModelThinking = (
  model: Record<string, any> | null,
  api: string,
) => {
  if (!model || typeof model.id !== "string") return;

  const modelId = model.id.toLowerCase();
  const compat = ensureCompat(model);

  if (modelId.startsWith("glm-5.2")) {
    model.reasoning = true;
    model.thinkingLevelMap = {
      off: "none",
      minimal: "none",
      low: "high",
      medium: "high",
      high: "high",
      xhigh: "max",
    };
    compat.thinkingFormat = "zai";
    compat.supportsReasoningEffort = true;
    compat.maxTokensField = "max_tokens";
    compat.supportsLongCacheRetention = false;
    return;
  }

  if (modelId.startsWith("glm-")) {
    model.reasoning = true;
    model.thinkingLevelMap = {
      off: "none",
      minimal: null,
      low: null,
      medium: null,
      high: "high",
      xhigh: "max",
    };
    compat.thinkingFormat = "zai";
    compat.supportsReasoningEffort = false;
    compat.maxTokensField = "max_tokens";
    compat.supportsLongCacheRetention = false;
    return;
  }

  if (modelId.startsWith("deepseek")) {
    model.reasoning = true;
    model.thinkingLevelMap = {
      minimal: null,
      low: null,
      medium: null,
      high: "high",
      xhigh: "max",
    };
    compat.thinkingFormat = "deepseek";
    compat.requiresReasoningContentOnAssistantMessages = true;
    compat.maxTokensField = "max_tokens";
    compat.supportsLongCacheRetention = false;
    return;
  }

  if (modelId.startsWith("claude")) {
    model.reasoning = true;
    model.thinkingLevelMap = {
      off: null,
      minimal: null,
      low: "low",
      medium: "medium",
      high: "high",
      xhigh: "xhigh",
    };
    compat.forceAdaptiveThinking = true;
    compat.supportsEagerToolInputStreaming = false;
    compat.supportsLongCacheRetention = false;
    return;
  }

  if (modelId.startsWith("gpt-") || modelId.startsWith("o")) {
    model.reasoning = true;
    model.thinkingLevelMap = {
      off: "none",
      minimal: null,
      low: "low",
      medium: "medium",
      high: "high",
      xhigh: "xhigh",
    };
    if (api === "openai-completions") {
      compat.maxTokensField ??= "max_tokens";
    }
  }
};

export const getPiAgentFormValues = (jsonString: string): PiAgentFormValues => {
  const config = parseJsonObject(jsonString || PI_AGENT_DEFAULT_CONFIG);
  const providerId = getProviderId(config);
  const provider = getProvider(config, providerId);
  const defaultModel =
    typeof config.settings?.defaultModel === "string"
      ? config.settings.defaultModel
      : getFirstModelId(provider);
  const model = getModel(provider, defaultModel);

  return {
    providerId,
    baseUrl: typeof provider.baseUrl === "string" ? provider.baseUrl : "",
    apiKey: typeof provider.apiKey === "string" ? provider.apiKey : "",
    api: typeof provider.api === "string" ? provider.api : "openai-completions",
    defaultModel,
    contextWindow: getPositiveIntegerString(model.contextWindow),
    maxTokens: getPositiveIntegerString(model.maxTokens),
  };
};

export const updatePiAgentConfig = (
  jsonString: string,
  updates: Partial<PiAgentFormValues>,
): string => {
  const config = parseJsonObject(jsonString || PI_AGENT_DEFAULT_CONFIG);
  if (!isRecord(config.models)) config.models = {};
  if (!isRecord(config.models.providers)) config.models.providers = {};
  if (!isRecord(config.settings)) config.settings = {};

  const previousProviderId = getProviderId(config);
  const providerId = updates.providerId?.trim() || previousProviderId;

  if (
    providerId !== previousProviderId &&
    isRecord(config.models.providers[previousProviderId])
  ) {
    config.models.providers[providerId] =
      config.models.providers[previousProviderId];
    delete config.models.providers[previousProviderId];
  }

  if (!isRecord(config.models.providers[providerId])) {
    config.models.providers[providerId] = { models: [] };
  }

  const provider = config.models.providers[providerId];
  if (updates.baseUrl !== undefined) provider.baseUrl = updates.baseUrl.trim();
  if (updates.apiKey !== undefined) provider.apiKey = updates.apiKey.trim();
  if (updates.api !== undefined) provider.api = updates.api;

  const defaultModel =
    updates.defaultModel?.trim() ??
    (typeof config.settings.defaultModel === "string"
      ? config.settings.defaultModel
      : getFirstModelId(provider));
  if (updates.defaultModel !== undefined) {
    config.settings.defaultModel = defaultModel;
  }

  const model = findOrCreateModel(provider, defaultModel);
  normalizePiAgentModelThinking(model, provider.api);
  applyPositiveIntegerUpdate(model, "contextWindow", updates.contextWindow);
  applyPositiveIntegerUpdate(model, "maxTokens", updates.maxTokens);

  config.settings.defaultProvider = providerId;

  return JSON.stringify(config, null, 2);
};

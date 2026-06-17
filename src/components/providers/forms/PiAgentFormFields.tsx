import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ProviderCategory } from "@/types";
import { ApiKeySection, ModelInputWithFetch } from "./shared";
import {
  fetchModelsForConfig,
  showFetchModelsError,
  type FetchedModel,
} from "@/lib/api/model-fetch";
import { PI_AGENT_API_PROTOCOLS } from "./helpers/piAgentFormUtils";

interface PiAgentFormFieldsProps {
  providerId: string;
  onProviderIdChange: (value: string) => void;
  baseUrl: string;
  onBaseUrlChange: (value: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  api: string;
  onApiChange: (value: string) => void;
  defaultModel: string;
  onDefaultModelChange: (value: string) => void;
  contextWindow: string;
  onContextWindowChange: (value: string) => void;
  maxTokens: string;
  onMaxTokensChange: (value: string) => void;
  category?: ProviderCategory;
  websiteUrl: string;
}

export function PiAgentFormFields({
  providerId,
  onProviderIdChange,
  baseUrl,
  onBaseUrlChange,
  apiKey,
  onApiKeyChange,
  api,
  onApiChange,
  defaultModel,
  onDefaultModelChange,
  contextWindow,
  onContextWindowChange,
  maxTokens,
  onMaxTokensChange,
  category,
  websiteUrl,
}: PiAgentFormFieldsProps) {
  const { t } = useTranslation();
  const [fetchedModels, setFetchedModels] = useState<FetchedModel[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const handleFetchModels = useCallback(() => {
    if (!baseUrl || !apiKey) {
      showFetchModelsError(null, t, {
        hasApiKey: !!apiKey,
        hasBaseUrl: !!baseUrl,
      });
      return;
    }

    setIsFetchingModels(true);
    fetchModelsForConfig(baseUrl, apiKey)
      .then((models) => {
        setFetchedModels(models);
        if (models.length === 0) {
          toast.info(t("providerForm.fetchModelsEmpty"));
        } else {
          toast.success(
            t("providerForm.fetchModelsSuccess", { count: models.length }),
          );
        }
      })
      .catch((err) => {
        console.warn("[PiAgentModelFetch] Failed:", err);
        showFetchModelsError(err, t);
      })
      .finally(() => setIsFetchingModels(false));
  }, [baseUrl, apiKey, t]);

  return (
    <>
      <div className="space-y-2">
        <FormLabel htmlFor="pi-provider-id">
          {t("piAgent.providerId", { defaultValue: "Provider ID" })}
        </FormLabel>
        <Input
          id="pi-provider-id"
          value={providerId}
          onChange={(event) =>
            onProviderIdChange(
              event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            )
          }
          placeholder="custom"
        />
        <p className="text-xs text-muted-foreground">
          {t("piAgent.providerIdHint", {
            defaultValue:
              "Written to models.providers and settings.defaultProvider in ~/.pi/agent.",
          })}
        </p>
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="pi-api">
          {t("piAgent.apiProtocol", { defaultValue: "API Protocol" })}
        </FormLabel>
        <Select value={api} onValueChange={onApiChange}>
          <SelectTrigger id="pi-api">
            <SelectValue
              placeholder={t("piAgent.selectProtocol", {
                defaultValue: "Select API protocol",
              })}
            />
          </SelectTrigger>
          <SelectContent>
            {PI_AGENT_API_PROTOCOLS.map((protocol) => (
              <SelectItem key={protocol.value} value={protocol.value}>
                {protocol.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="pi-baseurl">
          {t("piAgent.baseUrl", { defaultValue: "API Endpoint" })}
        </FormLabel>
        <Input
          id="pi-baseurl"
          value={baseUrl}
          onChange={(event) => onBaseUrlChange(event.target.value)}
          placeholder="https://api.example.com/v1"
        />
      </div>

      <ApiKeySection
        id="pi-api-key"
        value={apiKey}
        onChange={onApiKeyChange}
        category={category}
        shouldShowLink={false}
        websiteUrl={websiteUrl}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FormLabel htmlFor="pi-default-model">
            {t("piAgent.defaultModel", { defaultValue: "Default Model" })}
          </FormLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFetchModels}
            disabled={isFetchingModels}
            className="h-7 gap-1"
          >
            {isFetchingModels ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {t("providerForm.fetchModels")}
          </Button>
        </div>
        <ModelInputWithFetch
          id="pi-default-model"
          value={defaultModel}
          onChange={onDefaultModelChange}
          placeholder="gpt-5.1"
          fetchedModels={fetchedModels}
          isLoading={isFetchingModels}
        />
        <p className="text-xs text-muted-foreground">
          {t("piAgent.defaultModelHint", {
            defaultValue:
              "Also updates the current model entry so Pi can list and select it.",
          })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <FormLabel htmlFor="pi-context-window">
            {t("piAgent.contextWindow", { defaultValue: "Context Window" })}
          </FormLabel>
          <Input
            id="pi-context-window"
            inputMode="numeric"
            pattern="[0-9]*"
            value={contextWindow}
            onChange={(event) =>
              onContextWindowChange(event.target.value.replace(/\D/g, ""))
            }
            placeholder="1000000"
          />
        </div>
        <div className="space-y-2">
          <FormLabel htmlFor="pi-max-tokens">
            {t("piAgent.maxTokens", { defaultValue: "Max Output Tokens" })}
          </FormLabel>
          <Input
            id="pi-max-tokens"
            inputMode="numeric"
            pattern="[0-9]*"
            value={maxTokens}
            onChange={(event) =>
              onMaxTokensChange(event.target.value.replace(/\D/g, ""))
            }
            placeholder="131072"
          />
        </div>
      </div>
    </>
  );
}

import { useTranslation } from "react-i18next";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProviderCategory } from "@/types";
import { ApiKeySection } from "./shared";
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
  category,
  websiteUrl,
}: PiAgentFormFieldsProps) {
  const { t } = useTranslation();

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
        <FormLabel htmlFor="pi-default-model">
          {t("piAgent.defaultModel", { defaultValue: "Default Model" })}
        </FormLabel>
        <Input
          id="pi-default-model"
          value={defaultModel}
          onChange={(event) => onDefaultModelChange(event.target.value)}
          placeholder="gpt-5.1"
        />
        <p className="text-xs text-muted-foreground">
          {t("piAgent.defaultModelHint", {
            defaultValue:
              "Also updates the first model entry so Pi can list and select it.",
          })}
        </p>
      </div>
    </>
  );
}

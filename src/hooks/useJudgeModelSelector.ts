import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getDatabase,
  listSavedModels,
  upsertSavedModel,
  removeSavedModel,
  setJudgeModel,
} from "../db";
import type { SavedModel } from "../types";
import {
  getOpenRouterModels,
  type OpenRouterModelInfo,
} from "../utils/openrouter";

const MAX_SEARCH_RESULTS = 200;

const formatContextLength = (contextLength: number | null) => {
  if (!contextLength) return "ctx n/a";
  return `ctx ${contextLength.toLocaleString()}`;
};

const formatPriceValue = (value?: string) => {
  if (!value) return "n/a";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  if (numeric === 0) return "$0";
  const perMillion = numeric * 1000000;
  if (perMillion < 0.01) return perMillion.toExponential(2);
  return `$${perMillion.toFixed(2)}`;
};

const formatPricing = (pricing?: Record<string, string> | null) => {
  if (!pricing) return "pricing n/a";
  const prompt = pricing.prompt
    ? `input ${formatPriceValue(pricing.prompt)}/M`
    : null;
  const completion = pricing.completion
    ? `output ${formatPriceValue(pricing.completion)}/M`
    : null;
  const parts = [prompt, completion].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "pricing n/a";
};

export const formatModelDescription = (
  contextLength: number | null,
  inputModalities: string[],
  outputModalities: string[],
  pricing?: Record<string, string> | null
) => {
  const inputLabel =
    inputModalities.length > 0 ? inputModalities.join(",") : "n/a";
  const outputLabel =
    outputModalities.length > 0 ? outputModalities.join(",") : "n/a";
  return [
    formatContextLength(contextLength),
    `in ${inputLabel} | out ${outputLabel}`,
    formatPricing(pricing),
  ].join(" | ");
};

export interface JudgeModelSelectorState {
  savedModels: SavedModel[];
  savedModelIndex: number;
  setSavedModelIndex: (index: number) => void;
  savedModelOptions: Array<{ name: string; value: string; description: string }>;

  openRouterModels: OpenRouterModelInfo[];
  filteredOpenRouterModels: OpenRouterModelInfo[];
  visibleOpenRouterModels: OpenRouterModelInfo[];
  openRouterOptions: Array<{ name: string; value: string; description: string }>;
  modelsLoading: boolean;
  modelsError: string | null;

  showModelSearch: boolean;
  modelSearchQuery: string;
  setModelSearchQuery: (query: string) => void;
  modelSearchFocus: "search" | "list";
  setModelSearchFocus: (focus: "search" | "list") => void;
  modelSearchIndex: number;
  setModelSearchIndex: (index: number) => void;

  refreshSavedModels: () => void;
  loadOpenRouterModels: () => Promise<void>;
  openModelSearch: () => void;
  closeModelSearch: () => void;
  addSavedModel: (model: OpenRouterModelInfo) => void;
  deleteSavedModel: (modelId: string) => void;
  addJudgeModel: (modelId: string) => void;
  removeJudgeModel: (modelId: string) => void;
  isJudgeModel: (modelId: string) => boolean;
}

export function useJudgeModelSelector(): JudgeModelSelectorState {
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [savedModelIndex, setSavedModelIndex] = useState(0);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showModelSearch, setShowModelSearch] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [modelSearchFocus, setModelSearchFocus] = useState<"search" | "list">("search");
  const [modelSearchIndex, setModelSearchIndex] = useState(0);

  const refreshSavedModels = useCallback(() => {
    try {
      const db = getDatabase();
      setSavedModels(listSavedModels(db));
    } catch {
      setSavedModels([]);
    }
  }, []);

  const loadOpenRouterModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const models = await getOpenRouterModels();
      setOpenRouterModels(models);
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : String(error));
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSavedModels();
  }, [refreshSavedModels]);

  useEffect(() => {
    setSavedModelIndex((prev) =>
      Math.min(prev, Math.max(0, savedModels.length - 1))
    );
  }, [savedModels.length]);

  const filteredOpenRouterModels = useMemo(() => {
    const query = modelSearchQuery.trim().toLowerCase();
    if (!query) return openRouterModels;
    return openRouterModels.filter((model) => {
      return (
        model.name.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query)
      );
    });
  }, [openRouterModels, modelSearchQuery]);

  const visibleOpenRouterModels = useMemo(
    () => filteredOpenRouterModels.slice(0, MAX_SEARCH_RESULTS),
    [filteredOpenRouterModels]
  );

  useEffect(() => {
    setModelSearchIndex((prev) =>
      Math.min(prev, Math.max(0, visibleOpenRouterModels.length - 1))
    );
  }, [visibleOpenRouterModels.length]);

  const addSavedModel = useCallback(
    (model: OpenRouterModelInfo) => {
      try {
        const db = getDatabase();
        upsertSavedModel(db, {
          model_id: model.id,
          model_name: model.name,
          context_length: model.contextLength ?? null,
          input_modalities: model.inputModalities,
          output_modalities: model.outputModalities,
          pricing: model.pricing,
        });
        refreshSavedModels();
      } catch (error) {
        setModelsError(error instanceof Error ? error.message : String(error));
      }
    },
    [refreshSavedModels]
  );

  const deleteSavedModel = useCallback(
    (modelId: string) => {
      try {
        const db = getDatabase();
        removeSavedModel(db, modelId);
        refreshSavedModels();
      } catch {
        refreshSavedModels();
      }
    },
    [refreshSavedModels]
  );

  const addJudgeModel = useCallback(
    (modelId: string) => {
      try {
        const db = getDatabase();
        setJudgeModel(db, modelId, true);
        refreshSavedModels();
      } catch (error) {
        setModelsError(error instanceof Error ? error.message : String(error));
      }
    },
    [refreshSavedModels]
  );

  const removeJudgeModel = useCallback(
    (modelId: string) => {
      try {
        const db = getDatabase();
        setJudgeModel(db, modelId, false);
        refreshSavedModels();
      } catch (error) {
        setModelsError(error instanceof Error ? error.message : String(error));
      }
    },
    [refreshSavedModels]
  );

  const isJudgeModel = useCallback(
    (modelId: string) => {
      return savedModels.some((m) => m.model_id === modelId && m.is_judge === 1);
    },
    [savedModels]
  );

  const openModelSearch = useCallback(() => {
    setShowModelSearch(true);
    setModelSearchFocus("search");
    setModelSearchIndex(0);
    if (openRouterModels.length === 0 && !modelsLoading) {
      loadOpenRouterModels();
    }
  }, [openRouterModels.length, modelsLoading, loadOpenRouterModels]);

  const closeModelSearch = useCallback(() => {
    setShowModelSearch(false);
    setModelSearchFocus("search");
    setModelSearchQuery("");
    setModelSearchIndex(0);
  }, []);

  const savedModelOptions = useMemo(
    () =>
      savedModels.map((model) => ({
        name: model.model_name,
        value: model.model_id,
        description: formatModelDescription(
          model.context_length,
          model.input_modalities,
          model.output_modalities,
          model.pricing
        ),
      })),
    [savedModels]
  );

  const openRouterOptions = useMemo(
    () =>
      visibleOpenRouterModels.map((model) => ({
        name: model.name,
        value: model.id,
        description: formatModelDescription(
          model.contextLength,
          model.inputModalities,
          model.outputModalities,
          model.pricing
        ),
      })),
    [visibleOpenRouterModels]
  );

  return {
    savedModels,
    savedModelIndex,
    setSavedModelIndex,
    savedModelOptions,
    openRouterModels,
    filteredOpenRouterModels,
    visibleOpenRouterModels,
    openRouterOptions,
    modelsLoading,
    modelsError,
    showModelSearch,
    modelSearchQuery,
    setModelSearchQuery,
    modelSearchFocus,
    setModelSearchFocus,
    modelSearchIndex,
    setModelSearchIndex,
    refreshSavedModels,
    loadOpenRouterModels,
    openModelSearch,
    closeModelSearch,
    addSavedModel,
    deleteSavedModel,
    addJudgeModel,
    removeJudgeModel,
    isJudgeModel,
  };
}

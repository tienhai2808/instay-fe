const DEFAULT_APP_NAME = "instay-fe";

const parseBooleanEnv = (value: string | undefined, fallback: boolean) => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return fallback;

  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;

  return fallback;
};

const resolveAppVersion = () => {
  return (
    process.env.NEXT_PUBLIC_FARO_APP_VERSION?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    undefined
  );
};

const resolveAppRelease = () => {
  return (
    process.env.NEXT_PUBLIC_FARO_RELEASE?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    resolveAppVersion()
  );
};

export interface FaroBrowserConfig {
  apiKey?: string;
  app: {
    environment: string;
    name: string;
    release?: string;
    version?: string;
  };
  captureConsole: boolean;
  enabled: boolean;
  url: string;
}

export const getFaroBrowserConfig = (): FaroBrowserConfig => {
  const url = process.env.NEXT_PUBLIC_FARO_URL?.trim() ?? "";
  const apiKey = process.env.NEXT_PUBLIC_FARO_API_KEY?.trim() || undefined;

  const enabled = parseBooleanEnv(
    process.env.NEXT_PUBLIC_FARO_ENABLED,
    Boolean(url),
  );

  return {
    url,
    apiKey,
    enabled: enabled && Boolean(url),
    captureConsole: parseBooleanEnv(
      process.env.NEXT_PUBLIC_FARO_CAPTURE_CONSOLE,
      true,
    ),
    app: {
      name: process.env.NEXT_PUBLIC_FARO_APP_NAME?.trim() || DEFAULT_APP_NAME,
      environment:
        process.env.NEXT_PUBLIC_FARO_ENVIRONMENT?.trim() ||
        process.env.NODE_ENV ||
        "development",
      version: resolveAppVersion(),
      release: resolveAppRelease(),
    },
  };
};

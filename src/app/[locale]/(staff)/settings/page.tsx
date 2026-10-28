"use client";

import { createApiKey } from "@/apis/api-key";
import { getTenantInfo, updateTenantInfo } from "@/apis/tenant";
import { queryKeys } from "@/constants/query-keys";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useMessage } from "@/providers/MessageProvider";
import { useTenantStore } from "@/stores/useTenantStore";
import type { Tenant } from "@/types/data/tenant";
import type { UpdateTenantRequest } from "@/types/request/tenant";
import { resolvePublicImageUrl } from "@/utils/media";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, Image, Input, Spin } from "antd";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { BiCog, BiEditAlt, BiTrashAlt } from "react-icons/bi";
import TenantSettingsModal from "./components/TenantSettingsModal";

const API_KEY_MASK = "*".repeat(32);

export default function SettingsPage() {
  const t = useTranslations("SettingsPage");

  const [settingsForm] = Form.useForm<UpdateTenantRequest>();
  const watchedName = Form.useWatch("name", settingsForm);
  const watchedPhone = Form.useWatch("phone", settingsForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [chatAgentApiKey, setChatAgentApiKey] = useState("");
  const [tenantSettingsOpen, setTenantSettingsOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const messageApi = useMessage();
  const validation = useValidationMessages();
  const queryClient = useQueryClient();
  const tenantInStore = useTenantStore((state) => state.tenant);
  const setTenantInStore = useTenantStore((state) => state.setTenant);

  const {
    data: tenantRes,
    isFetching: isTenantFetching,
    error: tenantError,
  } = useQuery({
    queryKey: queryKeys.tenant.detail(),
    queryFn: async () => getTenantInfo(),
    staleTime: 300,
  });

  useEffect(() => {
    if (tenantError) {
      messageApi.errorFromApi(tenantError);
    }
  }, [tenantError, messageApi]);

  const tenantFromQuery = tenantRes?.data?.data?.tenant;
  const tenant = useMemo<Tenant | undefined>(
    () => tenantFromQuery ?? tenantInStore ?? undefined,
    [tenantFromQuery, tenantInStore],
  );

  useEffect(() => {
    if (!tenantFromQuery) return;
    setTenantInStore(tenantFromQuery);
  }, [setTenantInStore, tenantFromQuery]);

  useEffect(() => {
    if (!tenant) return;
    settingsForm.setFieldsValue({
      name: tenant.name || "",
      phone: tenant.phone || "",
    });
  }, [settingsForm, tenant]);

  useEffect(() => {
    if (!logoPreview) return;
    return () => {
      URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const updateTenantMutation = useMutation({
    mutationFn: async (payload: UpdateTenantRequest) =>
      updateTenantInfo(payload),
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async () => createApiKey(),
    onSuccess: (res) => {
      const nextApiKey = res.data.api_key?.trim() ?? "";

      if (!nextApiKey) {
        messageApi.error(t("apiKeyGenerateError"));
        return;
      }

      setChatAgentApiKey(nextApiKey);
      messageApi.success(t("apiKeyGenerated"));
    },
    onError: (error) => {
      messageApi.errorFromApi(error, t("apiKeyGenerateError"));
    },
  });

  const copyTextToClipboard = async (value: string) => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const handleUpdateTenant = async (data: UpdateTenantRequest) => {
    let uploadedLogoKey: string | undefined;

    if (logoFile) {
      const [uploaded] = await uploadFilesWithPresignedURLs([
        { file: logoFile },
      ]);
      uploadedLogoKey = uploaded.key;
    }

    const nextLogo = logoFile
      ? (uploadedLogoKey ?? tenant?.logo ?? null)
      : logoRemoved
        ? null
        : (tenant?.logo ?? null);

    const payload = { ...data, logo: nextLogo };
    await updateTenantMutation.mutateAsync(payload);

    const nextTenant: Tenant = {
      ...tenant,
      ...payload,
      logo: nextLogo,
    };

    queryClient.setQueryData(queryKeys.tenant.detail(), (previous: unknown) => {
      if (!previous || typeof previous !== "object") return previous;

      const record = previous as {
        data?: { data?: { tenant?: Tenant } };
      };

      if (!record.data?.data) return previous;

      return {
        ...record,
        data: {
          ...record.data,
          data: {
            ...record.data.data,
            tenant: nextTenant,
          },
        },
      };
    });
    setTenantInStore(nextTenant);

    if (logoFile) {
      setLogoFile(null);
      setLogoPreview(null);
    }
    if (logoRemoved) {
      setLogoRemoved(false);
      setLogoPreview(null);
    }
  };

  const handleSubmitInfo = async () => {
    if (!hasSettingsChanges) return;

    try {
      const values = await settingsForm.validateFields();
      await handleUpdateTenant(values);
    } catch {
      // antd form already renders validation messages inline
    }
  };

  const handlePickLogo = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreview(previewUrl);
    setLogoRemoved(false);
    e.target.value = "";
  };

  const handleRemoveLogo = () => {
    if (logoFile && logoPreview) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    if (tenant?.logo) {
      setLogoRemoved(true);
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      await createApiKeyMutation.mutateAsync();
    } catch {
      // mutation error is handled by onError
    }
  };

  const handleCopyApiKey = async () => {
    if (!chatAgentApiKey) return;

    try {
      await copyTextToClipboard(chatAgentApiKey);
      messageApi.success(t("apiKeyCopied"));
    } catch {
      messageApi.error(t("apiKeyCopyError"));
    }
  };

  const logoSrc =
    logoPreview ||
    (!logoRemoved ? resolvePublicImageUrl(tenant?.logo) : undefined);
  const showRemoveButton = Boolean(logoSrc);

  const logoInitials = useMemo(() => {
    const rawName = tenant?.name?.trim();
    if (!rawName) return "H";

    const words = rawName.split(/\s+/).filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

    return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
  }, [tenant?.name]);

  const hasSettingsChanges = tenant
    ? (watchedName || "") !== (tenant.name || "") ||
      (watchedPhone || "") !== (tenant.phone || "") ||
      Boolean(logoFile) ||
      logoRemoved
    : false;

  const loading = isTenantFetching || updateTenantMutation.isPending;
  const isApiKeyLoading = createApiKeyMutation.isPending;

  return (
    <div className="min-auto">
      <div className="mx-auto mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-black">{t("title")}</h1>
        </div>
        <button
          type="button"
          onClick={() => setTenantSettingsOpen(true)}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
        >
          <BiCog className="text-base" />
          {t("openSettings")}
        </button>
      </div>

      <div className="mx-auto">
        <Spin spinning={loading} size="large">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex shrink-0 flex-col items-center gap-3 rounded-xl bg-[#fafafa] p-5 shadow-md sm:p-8 md:w-72">
                <div className="text-center mt-1">
                  <div className="text-base font-bold">{t("logo")}</div>
                </div>
                <div className="h-40 w-40 select-none overflow-hidden rounded-full bg-[#8b5cf6] text-3xl font-bold text-white shadow-md flex items-center justify-center sm:h-54 sm:w-54 sm:text-4xl">
                  {logoSrc ? (
                    <Image
                      src={logoSrc}
                      width={216}
                      height={216}
                      alt="tenant-logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{logoInitials}</span>
                  )}
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <button
                    onClick={handlePickLogo}
                    className="cursor-pointer flex w-full items-center justify-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition hover:bg-gray-50 sm:w-auto"
                  >
                    <BiEditAlt className="text-sm text-blue-500" />{" "}
                    {t("editLogo")}
                  </button>
                  <button
                    onClick={handleRemoveLogo}
                    disabled={!showRemoveButton}
                    className={`flex w-full items-center justify-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition hover:bg-gray-50 sm:w-auto ${
                      showRemoveButton
                        ? "cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <BiTrashAlt className="text-sm text-red-500" />{" "}
                    {t("deleteLogo")}
                  </button>
                </div>

                <div className="text-center mt-1">
                  <div className="text-xl mb-2 mt-2 font-semibold">
                    {tenant?.name}
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <Form
                  form={settingsForm}
                  layout="vertical"
                  requiredMark={false}
                  className="flex flex-col gap-5 rounded-xl bg-[#fafafa] p-4 shadow-sm sm:p-6!"
                >
                  <div>
                    <h2 className="text-sm font-semibold mb-4 tracking-wide">
                      {t("hotelInfo")}
                    </h2>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                      <Form.Item
                        className="mb-0"
                        name="name"
                        label={
                          <span className="block text-sm font-medium">
                            {t("hotelName")}
                          </span>
                        }
                        rules={[
                          {
                            required: true,
                            message: validation.required(
                              validation.field("hotelName"),
                            ),
                          },
                        ]}
                      >
                        <Input className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition" />
                      </Form.Item>
                      <Form.Item
                        className="mb-0"
                        name="phone"
                        label={
                          <span className="block text-sm font-medium">
                            {t("phone")}
                          </span>
                        }
                        rules={[
                          {
                            required: true,
                            message: validation.required(
                              validation.field("phone"),
                            ),
                          },
                          {
                            pattern: /^\d{10}$/,
                            message: validation.exactChars(
                              validation.field("phone"),
                              10,
                            ),
                          },
                        ]}
                      >
                        <Input className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition" />
                      </Form.Item>
                    </div>
                  </div>
                </Form>

                <div className="rounded-xl h-full bg-[#fafafa] p-4 shadow-sm sm:p-6">
                  <h2 className="text-sm font-semibold tracking-wide">
                    {t("chatQualityAgentApiKey")}
                  </h2>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Input
                      readOnly
                      value={chatAgentApiKey ? API_KEY_MASK : ""}
                      placeholder={t("chatQualityAgentApiKeyPlaceholder")}
                      className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white"
                    />

                    <button
                      type="button"
                      onClick={handleGenerateApiKey}
                      disabled={isApiKeyLoading}
                      className="w-full rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-32"
                    >
                      {isApiKeyLoading ? t("generatingApiKey") : t("getApiKey")}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyApiKey}
                      disabled={!chatAgentApiKey}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-32"
                    >
                      {t("copyApiKey")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium !text-gray-700 transition hover:bg-gray-50 sm:w-auto text-center no-underline"
              >
                {t("cancel")}
              </Link>
              <button
                type="button"
                onClick={handleSubmitInfo}
                disabled={loading || !hasSettingsChanges}
                className="w-full rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </Spin>
      </div>

      <TenantSettingsModal
        open={tenantSettingsOpen}
        onClose={() => setTenantSettingsOpen(false)}
      />
    </div>
  );
}

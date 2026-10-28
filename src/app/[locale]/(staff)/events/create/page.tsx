"use client";

import { useEffect, useMemo } from "react";
import { Spin } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BsChevronLeft } from "react-icons/bs";
import { getBasicBranches } from "@/apis/branch";
import { createEvent } from "@/apis/event";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import type { CreateEventRequest } from "@/types/request/event";
import { resolvePublicImageUrl } from "@/utils/media";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import EventForm, {
  type EventBranchOption,
  type EventFormSubmitPayload,
} from "../components/EventForm";
import { eventQueryKeys } from "../event-query-keys";

const normalizeStoragePrefix = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

const inferImageKeyFromSrc = (src?: string | null) => {
  if (!src) return null;

  if (/^https?:\/\//i.test(src)) {
    const prefix = normalizeStoragePrefix(
      process.env.NEXT_PUBLIC_GCS_PUBLIC_PREFIX ||
        "https://storage.googleapis.com/instay-dev-public-bucket/",
    );

    if (!src.startsWith(prefix)) return null;
    return decodeURIComponent(src.slice(prefix.length));
  }

  return src.startsWith("/") ? src.slice(1) : src;
};

const buildEventContentPayload = async (
  content: string,
  images: EventFormSubmitPayload["contentImages"],
) => {
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(content || "<p></p>", "text/html");
  const imageNodes = Array.from(doc.querySelectorAll("img"));
  const pendingImagesById = new Map(
    images.map((image) => [image.localId, image.file]),
  );

  const localImageIds = Array.from(
    new Set(
      imageNodes
        .map((node) => node.getAttribute("data-local-id") || "")
        .filter(Boolean),
    ),
  );

  const uploadTargets = localImageIds.map((localId) => {
    const file = pendingImagesById.get(localId);
    if (!file) {
      throw new Error("EVENT_CONTENT_IMAGE_FILE_MISSING");
    }

    return {
      localId,
      file,
    };
  });

  const uploadedImages = await uploadFilesWithPresignedURLs(
    uploadTargets.map((target) => ({ file: target.file })),
  );

  const keyByLocalId = new Map<string, string>();
  uploadTargets.forEach((target, index) => {
    const key = uploadedImages[index]?.key;
    if (key) {
      keyByLocalId.set(target.localId, key);
    }
  });

  imageNodes.forEach((node) => {
    const localId = node.getAttribute("data-local-id");
    const uploadedKey = localId ? keyByLocalId.get(localId) : null;
    const fallbackKey = inferImageKeyFromSrc(node.getAttribute("src"));
    const key = uploadedKey || fallbackKey;

    if (!key) return;

    node.setAttribute("src", resolvePublicImageUrl(key) || key);
    node.setAttribute("data-key", key);
    node.removeAttribute("data-local-id");
  });

  return doc.body.innerHTML.trim();
};

const extractEventIdFromPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const directId = record.id;
  if (typeof directId === "string" && directId) return directId;
  if (typeof directId === "number") return String(directId);

  const nestedEvent = record.event;
  if (nestedEvent && typeof nestedEvent === "object") {
    const nestedId = (nestedEvent as { id?: unknown }).id;
    if (typeof nestedId === "string" && nestedId) return nestedId;
    if (typeof nestedId === "number") return String(nestedId);
  }

  return null;
};

const isMissingContentImageError = (error: unknown) =>
  error instanceof Error &&
  error.message === "EVENT_CONTENT_IMAGE_FILE_MISSING";

export default function CreateEventPage() {
  const t = useTranslations("EventsPage");
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const scopedBranchIds = useMemo(
    () => (user?.branches || []).map((branch) => String(branch.id)),
    [user?.branches],
  );
  const allowGlobalBranches = scopedBranchIds.length === 0;

  const createMutation = useMutation({
    mutationFn: async (payload: CreateEventRequest) => createEvent(payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });

      const createdId = extractEventIdFromPayload(res.data.data);
      if (createdId) {
        router.push(`/events/${createdId}`);
        return;
      }

      router.push("/events");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const {
    data: branchesRes,
    isFetching: isBranchesFetching,
    error: branchesError,
  } = useQuery({
    queryKey: queryKeys.branches.basic(),
    queryFn: getBasicBranches,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  const branchOptions = useMemo<EventBranchOption[]>(() => {
    const options = (branchesRes?.data?.data?.branches || []).map((branch) => ({
      value: String(branch.id),
      label: branch.name || `#${branch.id}`,
    }));

    if (allowGlobalBranches) return options;

    const scopedBranchIdSet = new Set(scopedBranchIds);
    return options.filter((option) => scopedBranchIdSet.has(option.value));
  }, [allowGlobalBranches, branchesRes?.data?.data?.branches, scopedBranchIds]);

  const handleCreate = async ({
    values,
    thumbnailFile,
    contentImages,
    intent,
  }: EventFormSubmitPayload) => {
    try {
      if (!thumbnailFile) {
        messageApi.error(t("form.thumbnailRequired"));
        return;
      }

      const [uploaded] = await uploadFilesWithPresignedURLs([
        { file: thumbnailFile },
      ]);

      const payload: CreateEventRequest = {
        title: values.title,
        excerpt: values.excerpt,
        content: await buildEventContentPayload(values.content, contentImages),
        thumbnail: uploaded?.key || "",
        is_active: intent === "publish",
        branch_ids: values.branch_ids || [],
        ...(intent === "publish"
          ? { send_notification: values.send_notification }
          : {}),
      };

      createMutation.mutate(payload);
    } catch (error) {
      if (isMissingContentImageError(error)) {
        messageApi.error(t("form.contentImageMissing"));
        return;
      }

      messageApi.errorFromApi(error, t("form.contentImageUploadFailed"));
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex justify-between items-start text-black">
        <div>
          <Link
            href="/events"
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            {t("createPage.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("createPage.title")}</h1>
        </div>
      </div>

      <div className="px-0 lg:px-16">
        <Spin spinning={isBranchesFetching} size="large">
          <EventForm
            mode="create"
            branchOptions={branchOptions}
            branchLoading={isBranchesFetching}
            allowGlobalBranches={allowGlobalBranches}
            submitting={createMutation.isPending}
            onCancel={() => router.push("/events")}
            onSubmit={handleCreate}
          />
        </Spin>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import { Spin } from "antd";
import type { UploadFile } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BsChevronLeft } from "react-icons/bs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBasicBranches } from "@/apis/branch";
import { deleteEvent, getEventById, updateEvent } from "@/apis/event";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Event } from "@/types/data/event";
import type { UpdateEventRequest } from "@/types/request/event";
import { resolvePublicImageUrl } from "@/utils/media";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import EventForm, {
  type EventBranchOption,
  type EventFormSubmitPayload,
  type EventFormValues,
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

const getEventFromResponse = (payload: unknown): Event | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const candidate =
    "event" in record && record.event && typeof record.event === "object"
      ? record.event
      : payload;

  if (!candidate || typeof candidate !== "object") return null;

  const event = candidate as Event;
  if (!event.id) return null;

  return event;
};

const isMissingContentImageError = (error: unknown) =>
  error instanceof Error &&
  error.message === "EVENT_CONTENT_IMAGE_FILE_MISSING";

export default function EventDetailsPage() {
  const t = useTranslations("EventsPage");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const scopedBranchIds = useMemo(
    () => (user?.branches || []).map((branch) => String(branch.id)),
    [user?.branches],
  );
  const allowGlobalBranches = scopedBranchIds.length === 0;

  const eventId = useMemo(() => {
    const rawId = params?.id;
    if (Array.isArray(rawId)) return rawId[0];
    return rawId;
  }, [params]);

  const {
    data: eventRes,
    isFetching: isEventFetching,
    error: eventError,
  } = useQuery({
    queryKey: eventQueryKeys.detail(eventId || ""),
    queryFn: async () => getEventById(eventId as string),
    enabled: Boolean(eventId),
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
    if (eventError) {
      messageApi.errorFromApi(eventError);
    }
  }, [eventError, messageApi]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  const event = useMemo(
    () => getEventFromResponse(eventRes?.data?.data),
    [eventRes?.data?.data],
  );

  const eventBranchIds = useMemo(
    () => (event?.branches || []).map((branch) => String(branch.id)),
    [event?.branches],
  );
  const canManageEvent = useMemo(() => {
    if (!event) return true;
    if (allowGlobalBranches) return true;
    if (!eventBranchIds.length) return false;

    const scopedBranchIdSet = new Set(scopedBranchIds);
    return eventBranchIds.every((branchId) => scopedBranchIdSet.has(branchId));
  }, [allowGlobalBranches, event, eventBranchIds, scopedBranchIds]);

  const branchOptions = useMemo<EventBranchOption[]>(() => {
    const options = (branchesRes?.data?.data?.branches || []).map((branch) => ({
      value: String(branch.id),
      label: branch.name || `#${branch.id}`,
    }));

    if (allowGlobalBranches) return options;

    const scopedBranchIdSet = new Set(scopedBranchIds);
    return options.filter((option) => scopedBranchIdSet.has(option.value));
  }, [allowGlobalBranches, branchesRes?.data?.data?.branches, scopedBranchIds]);

  useEffect(() => {
    if (!eventId) return;
    if (isEventFetching) return;
    if (eventError) return;
    if (event) return;

    messageApi.error(t("detailPage.errors.notFound"));
    router.replace("/events");
  }, [event, eventError, eventId, isEventFetching, messageApi, router, t]);

  const updateMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      payload: UpdateEventRequest;
    }) => updateEvent(variables.id, variables.payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });

      if (eventId) {
        await queryClient.invalidateQueries({
          queryKey: eventQueryKeys.detail(eventId),
        });
      }
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteEvent(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
      router.replace("/events");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const initialValues = useMemo<Partial<EventFormValues> | undefined>(() => {
    if (!event) return undefined;

    return {
      title: event.title || "",
      excerpt: event.excerpt || "",
      content: event.content || "",
      is_active: Boolean(event.is_active),
      branch_ids: eventBranchIds,
      send_notification: false,
    };
  }, [event, eventBranchIds]);

  const initialThumbnailFileList = useMemo<UploadFile[]>(() => {
    const thumbnailUrl = resolvePublicImageUrl(event?.thumbnail);
    if (!thumbnailUrl) return [];

    return [
      {
        uid: `event-thumbnail-${event?.id || "preview"}`,
        name: "thumbnail",
        status: "done",
        url: thumbnailUrl,
      },
    ];
  }, [event?.id, event?.thumbnail]);

  const formKey = useMemo(() => {
    return `${event?.id || "event"}-${event?.thumbnail || "no-thumbnail"}-${event?.updated_at || ""}-${eventBranchIds.join(",")}`;
  }, [event?.id, event?.thumbnail, event?.updated_at, eventBranchIds]);
  const canSendNotification = !event?.published_at;

  const handleSubmit = async ({
    values,
    thumbnailFile,
    contentImages,
  }: EventFormSubmitPayload) => {
    try {
      if (!eventId || !event) return;

      let thumbnailKey = event.thumbnail || "";

      if (thumbnailFile) {
        const [uploaded] = await uploadFilesWithPresignedURLs([
          { file: thumbnailFile },
        ]);
        thumbnailKey = uploaded?.key || "";
      }

      const payload: UpdateEventRequest = {
        title: values.title,
        excerpt: values.excerpt,
        content: await buildEventContentPayload(values.content, contentImages),
        thumbnail: thumbnailKey,
        is_active: Boolean(values.is_active),
        branch_ids: values.branch_ids || [],
        ...(canSendNotification
          ? { send_notification: values.send_notification }
          : {}),
      };

      updateMutation.mutate({ id: eventId, payload });
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
      <div className="mb-6 flex flex-col gap-4 text-black sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/events"
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            {t("detailPage.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("detailPage.title")}</h1>
        </div>
      </div>

      <div className="px-0 lg:px-16">
        <Spin spinning={isEventFetching || isBranchesFetching} size="large">
          <EventForm
            key={formKey}
            mode="edit"
            branchOptions={branchOptions}
            branchLoading={isBranchesFetching}
            allowGlobalBranches={allowGlobalBranches}
            readOnly={!canManageEvent}
            submitting={updateMutation.isPending}
            deleting={deleteMutation.isPending}
            showSendNotification={canSendNotification}
            initialValues={initialValues}
            initialThumbnailFileList={initialThumbnailFileList}
            cancelHref="/events"
            meta={
              event
                ? {
                    created_by: event.created_by,
                    updated_by: event.updated_by,
                    created_at: event.created_at,
                    updated_at: event.updated_at,
                    published_at: event.published_at,
                  }
                : undefined
            }
            onDelete={() => {
              if (!canManageEvent) return;
              if (!eventId) return;
              deleteMutation.mutate(eventId);
            }}
            onSubmit={handleSubmit}
          />
        </Spin>
      </div>
    </div>
  );
}

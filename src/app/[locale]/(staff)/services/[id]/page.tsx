"use client";

import { useEffect, useMemo } from "react";
import { Spin } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BsChevronLeft } from "react-icons/bs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBasicBranches } from "@/apis/branch";
import { deleteService, getServiceById, updateService } from "@/apis/service";
import { getServiceTypes } from "@/apis/service_type";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import type { Service } from "@/types/data/service";
import type {
  ServiceImagePayload,
  UpdateServiceRequest,
} from "@/types/request/service";
import { resolvePublicImageUrl } from "@/utils/media";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import ServiceForm, {
  type BranchOption,
  type ServiceFormSubmitPayload,
  type ServiceFormValues,
  type ServiceTypeOption,
} from "../components/Form";
import type { ServiceImageInputItem } from "../components/ServiceImagesInput";
import { serviceTypesQueryKeys, servicesQueryKeys } from "../query-keys";

const getServiceFromResponse = (payload: unknown): Service | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const candidate =
    "service" in record && record.service && typeof record.service === "object"
      ? record.service
      : payload;

  if (!candidate || typeof candidate !== "object") return null;

  const service = candidate as Service;
  if (!service.id) return null;

  return service;
};

const buildServiceImagesPayload = async (
  images: ServiceFormSubmitPayload["images"],
): Promise<ServiceImagePayload[]> => {
  const uploadTargets = images.filter((image) => image.file instanceof File);

  const uploadedResults = await uploadFilesWithPresignedURLs(
    uploadTargets.map((image) => ({ file: image.file as File })),
  );

  const uploadedKeyByImageId = new Map<string, string>();
  uploadTargets.forEach((image, index) => {
    const key = uploadedResults[index]?.key;
    if (key) uploadedKeyByImageId.set(image.id, key);
  });

  return images.map((image, index) => {
    const key =
      image.file instanceof File
        ? uploadedKeyByImageId.get(image.id)
        : image.key;

    if (!key) {
      throw new Error("SERVICE_IMAGE_KEY_MISSING");
    }

    return {
      key,
      is_thumbnail: Boolean(image.is_thumbnail),
      sort_order: index + 1,
    };
  });
};

const toDayjsValue = (value?: string) => {
  if (!value) return undefined;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return undefined;
  return parsed;
};

const buildServiceDiscountPayload = (
  values: ServiceFormSubmitPayload["values"],
) => {
  if (
    !values.discount_type ||
    typeof values.discount_value !== "number" ||
    !values.discount_start_at ||
    !values.discount_end_at
  ) {
    return {};
  }

  return {
    discount_type: values.discount_type,
    discount_value: values.discount_value,
    discount_start_at: values.discount_start_at.toISOString(),
    discount_end_at: values.discount_end_at.toISOString(),
  };
};

const hasInvalidAmountDiscount = (values: ServiceFormSubmitPayload["values"]) =>
  values.discount_type === "amount" &&
  typeof values.discount_value === "number" &&
  typeof values.price === "number" &&
  values.discount_value > values.price;

export default function ServiceDetailsPage() {
  const t = useTranslations("ServicesPage");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const serviceId = useMemo(() => {
    const rawId = params?.id;
    if (Array.isArray(rawId)) return rawId[0];
    return rawId;
  }, [params]);

  const {
    data: serviceTypesRes,
    isFetching: isServiceTypesFetching,
    error: serviceTypesError,
  } = useQuery({
    queryKey: serviceTypesQueryKeys.basic(),
    queryFn: async () => getServiceTypes({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
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

  const {
    data: serviceRes,
    isFetching: isServiceFetching,
    error: serviceError,
  } = useQuery({
    queryKey: servicesQueryKeys.detail(serviceId || ""),
    queryFn: async () => getServiceById(serviceId as string),
    enabled: Boolean(serviceId),
  });

  useEffect(() => {
    if (serviceTypesError) {
      messageApi.errorFromApi(serviceTypesError);
    }
  }, [messageApi, serviceTypesError]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (serviceError) {
      messageApi.errorFromApi(serviceError);
    }
  }, [messageApi, serviceError]);

  const service = useMemo(
    () => getServiceFromResponse(serviceRes?.data?.data),
    [serviceRes?.data?.data],
  );

  useEffect(() => {
    if (!serviceId) return;
    if (isServiceFetching) return;
    if (serviceError) return;
    if (service) return;

    messageApi.error(t("detailPage.errors.notFound"));
    router.replace("/services");
  }, [
    isServiceFetching,
    messageApi,
    router,
    service,
    serviceError,
    serviceId,
    t,
  ]);

  const updateMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      payload: UpdateServiceRequest;
    }) => updateService(variables.id, variables.payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");

      if (serviceId) {
        await queryClient.invalidateQueries({
          queryKey: servicesQueryKeys.detail(serviceId),
        });
      }

      await queryClient.invalidateQueries({ queryKey: servicesQueryKeys.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteService(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: servicesQueryKeys.all });
      router.replace("/services");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const serviceTypeOptions = useMemo<ServiceTypeOption[]>(
    () =>
      (serviceTypesRes?.data?.data?.service_types || []).map((serviceType) => ({
        value: String(serviceType.id),
        label: serviceType.name || `#${serviceType.id}`,
      })),
    [serviceTypesRes?.data?.data?.service_types],
  );

  const branchOptions = useMemo<BranchOption[]>(
    () =>
      (branchesRes?.data?.data?.branches || []).map((branch) => ({
        value: String(branch.id),
        label: branch.name || `#${branch.id}`,
      })),
    [branchesRes?.data?.data?.branches],
  );

  const initialValues = useMemo<Partial<ServiceFormValues> | undefined>(() => {
    if (!service) return undefined;

    return {
      name: service.name || "",
      service_type_id: service.service_type?.id || "",
      branch_ids: (service.branches || []).map((branch) => String(branch.id)),
      price: typeof service.price === "number" ? service.price : 0,
      is_active: Boolean(service.is_active),
      description: service.description || "",
      discount_type: service.discount_type,
      discount_value:
        typeof service.discount_value === "number"
          ? service.discount_value
          : undefined,
      discount_start_at: toDayjsValue(service.discount_start_at),
      discount_end_at: toDayjsValue(service.discount_end_at),
    };
  }, [service]);

  const initialImages = useMemo<ServiceImageInputItem[]>(() => {
    if (!service?.images?.length) return [];

    const sortedImages = [...service.images].sort((a, b) => {
      const aSort = typeof a.sort_order === "number" ? a.sort_order : 0;
      const bSort = typeof b.sort_order === "number" ? b.sort_order : 0;
      return aSort - bSort;
    });

    return sortedImages.map((image, index) => ({
      id: `service-image-${service.id}-${image.key || index}`,
      key: image.key,
      preview_url: resolvePublicImageUrl(image.key) || image.key,
      is_thumbnail: Boolean(image.is_thumbnail),
    }));
  }, [service]);

  const formKey = useMemo(() => {
    return `${service?.id || "service"}-${service?.updated_at || ""}-${service?.images?.length || 0}-${service?.branches?.length || 0}`;
  }, [
    service?.branches?.length,
    service?.id,
    service?.images?.length,
    service?.updated_at,
  ]);

  const handleSubmit = async ({ values, images }: ServiceFormSubmitPayload) => {
    if (!serviceId) return;
    if (hasInvalidAmountDiscount(values)) {
      messageApi.error(t("form.discountAmountRangeInvalid"));
      return;
    }

    const imagePayload = await buildServiceImagesPayload(images);

    const payload: UpdateServiceRequest = {
      name: values.name,
      service_type_id: values.service_type_id,
      branch_ids: values.branch_ids,
      price: values.price,
      is_active: Boolean(values.is_active),
      description: values.description,
      ...buildServiceDiscountPayload(values),
      images: imagePayload,
    };

    updateMutation.mutate({ id: serviceId, payload });
  };

  const handleDelete = async () => {
    if (!serviceId) return;
    deleteMutation.mutate(serviceId);
  };

  const loading =
    isServiceTypesFetching || isBranchesFetching || isServiceFetching;

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/services"
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            {t("detailPage.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("detailPage.title")}</h1>
        </div>
      </div>

      <div className="px-0 lg:px-16">
        <Spin spinning={loading} size="large">
          <ServiceForm
            key={formKey}
            mode="edit"
            submitting={updateMutation.isPending}
            deleting={deleteMutation.isPending}
            serviceTypeOptions={serviceTypeOptions}
            branchOptions={branchOptions}
            branchLoading={isBranchesFetching}
            initialValues={initialValues}
            initialImages={initialImages}
            cancelHref="/services"
            meta={
              service
                ? {
                    created_by: service.created_by,
                    updated_by: service.updated_by,
                    created_at: service.created_at,
                    updated_at: service.updated_at,
                  }
                : undefined
            }
            onDelete={handleDelete}
            onSubmit={handleSubmit}
          />
        </Spin>
      </div>
    </div>
  );
}

"use client";

import { Spin } from "antd";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { BsChevronLeft } from "react-icons/bs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBasicBranches } from "@/apis/branch";
import { createService } from "@/apis/service";
import { getServiceTypes } from "@/apis/service_type";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import type {
  CreateServiceRequest,
  ServiceImagePayload,
} from "@/types/request/service";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import ServiceForm, {
  type BranchOption,
  type ServiceFormSubmitPayload,
  type ServiceTypeOption,
} from "../components/Form";
import { serviceTypesQueryKeys, servicesQueryKeys } from "../query-keys";
import { useEffect, useMemo } from "react";

const extractServiceIdFromPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const directId = record.id;
  if (typeof directId === "string" && directId) return directId;
  if (typeof directId === "number") return String(directId);

  const nestedService = record.service;
  if (nestedService && typeof nestedService === "object") {
    const nestedId = (nestedService as { id?: unknown }).id;
    if (typeof nestedId === "string" && nestedId) return nestedId;
    if (typeof nestedId === "number") return String(nestedId);
  }

  return null;
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

export default function CreateServicePage() {
  const t = useTranslations("ServicesPage");
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const {
    data: serviceTypesRes,
    isFetching: loadingServiceTypes,
    error: serviceTypesError,
  } = useQuery({
    queryKey: serviceTypesQueryKeys.basic(),
    queryFn: async () => getServiceTypes({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: branchesRes,
    isFetching: loadingBranches,
    error: branchesError,
  } = useQuery({
    queryKey: queryKeys.branches.basic(),
    queryFn: getBasicBranches,
    staleTime: 5 * 60 * 1000,
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

  const createMutation = useMutation({
    mutationFn: async (payload: CreateServiceRequest) => createService(payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: servicesQueryKeys.all });

      const createdId = extractServiceIdFromPayload(res.data.data);
      if (createdId) {
        router.push(`/services/${createdId}`);
        return;
      }

      router.push("/services");
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

  const handleCancel = () => {
    router.push("/services");
  };

  const handleCreate = async ({ values, images }: ServiceFormSubmitPayload) => {
    const imagePayload = await buildServiceImagesPayload(images);

    const payload: CreateServiceRequest = {
      name: values.name,
      service_type_id: values.service_type_id,
      branch_ids: values.branch_ids,
      price: values.price,
      is_active: true,
      description: values.description,
      ...buildServiceDiscountPayload(values),
      images: imagePayload,
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex justify-between items-start text-black">
        <div>
          <Link
            href="/services"
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            {t("createPage.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("createPage.title")}</h1>
        </div>
      </div>

      <div className="px-0 lg:px-16">
        <Spin spinning={loadingServiceTypes || loadingBranches} size="large">
          <ServiceForm
            mode="create"
            submitting={createMutation.isPending}
            serviceTypeOptions={serviceTypeOptions}
            branchOptions={branchOptions}
            branchLoading={loadingBranches}
            onCancel={handleCancel}
            onSubmit={handleCreate}
          />
        </Spin>
      </div>
    </div>
  );
}

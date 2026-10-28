"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { BsChevronLeft } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrderServiceForAdmin } from "@/apis/order_service";
import { getServiceById } from "@/apis/service";
import {
  getServiceTypes,
  getServiceTypesWithServices,
} from "@/apis/service_type";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useMessage } from "@/providers/MessageProvider";
import type { Service, ServiceDiscountType } from "@/types/data/service";
import { resolvePublicImageUrl } from "@/utils/media";
import {
  getServiceDiscountMeta,
  getServiceDiscountedPrice,
  isServiceDiscountActive,
} from "@/utils/service-discount";

interface BookingRoomServiceOrderModalProps {
  open: boolean;
  bookingRoomId?: string;
  branchId?: string;
  onClose: () => void;
}

interface ServiceCatalogItem {
  id: string;
  name: string;
  price?: number;
  discount_type?: ServiceDiscountType;
  discount_value?: number;
  discount_start_at?: string;
  discount_end_at?: string;
  thumbnailUrl?: string;
  serviceTypeName?: string;
}

interface ServiceTypeCatalogItem {
  id: string;
  name: string;
  services: ServiceCatalogItem[];
}

interface ServiceTypeOption {
  label: string;
  value: string;
}

interface OrderServiceFormValues {
  quantity?: number;
  estimated_at?: Dayjs;
  guest_note?: string;
}

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";

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

const toPriceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalizedValue = value.trim().replace(/,/g, "");
    if (!normalizedValue) return undefined;

    const parsed = Number(normalizedValue);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
};

const getServiceThumbnailUrl = (
  service?: Service | null,
  fallback?: string,
) => {
  const thumbnailKey =
    service?.images?.find((image) => image?.is_thumbnail)?.key ||
    service?.images?.[0]?.key;

  return resolvePublicImageUrl(thumbnailKey || fallback || undefined);
};

export default function BookingRoomServiceOrderModal({
  open,
  bookingRoomId,
  branchId,
  onClose,
}: BookingRoomServiceOrderModalProps) {
  const t = useTranslations("BookingsPage");
  const validation = useValidationMessages();
  const locale = useLocale();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<OrderServiceFormValues>();

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [serviceTypeIdFilter, setServiceTypeIdFilter] = useState<
    string | undefined
  >(undefined);
  const [selectedService, setSelectedService] =
    useState<ServiceCatalogItem | null>(null);
  const watchedQuantity = Form.useWatch("quantity", form);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSearchValue = searchValue.trim();
      setAppliedSearch((previousValue) =>
        previousValue === nextSearchValue ? previousValue : nextSearchValue,
      );
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchValue]);

  const serviceFilters = useMemo(
    () => ({
      search: appliedSearch || undefined,
      service_type_id: serviceTypeIdFilter || undefined,
      branch_id: branchId,
    }),
    [appliedSearch, branchId, serviceTypeIdFilter],
  );

  const {
    data: serviceTypesRes,
    isFetching: loadingServiceTypes,
    error: serviceTypesError,
  } = useQuery({
    queryKey: queryKeys.serviceTypes.withServices(serviceFilters),
    queryFn: async () => getServiceTypesWithServices(serviceFilters),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: serviceTypeOptionsRes,
    isFetching: loadingServiceTypeOptions,
    error: serviceTypeOptionsError,
  } = useQuery({
    queryKey: queryKeys.serviceTypes.basic(),
    queryFn: async () => getServiceTypes({ view: "basic" }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: selectedServiceDetailRes,
    isFetching: loadingServiceDetail,
    error: selectedServiceDetailError,
  } = useQuery({
    queryKey: ["services", "detail", selectedService?.id || ""],
    queryFn: async () => getServiceById(selectedService?.id as string),
    enabled: open && Boolean(selectedService?.id),
  });

  useEffect(() => {
    if (!serviceTypesError) return;
    messageApi.errorFromApi(serviceTypesError);
  }, [messageApi, serviceTypesError]);

  useEffect(() => {
    if (!serviceTypeOptionsError) return;
    messageApi.errorFromApi(serviceTypeOptionsError);
  }, [messageApi, serviceTypeOptionsError]);

  useEffect(() => {
    if (!selectedServiceDetailError) return;
    messageApi.errorFromApi(selectedServiceDetailError);
  }, [messageApi, selectedServiceDetailError]);

  const createOrderServiceMutation = useMutation({
    mutationFn: async (payload: {
      booking_room_id: string;
      service_id: string;
      quantity: number;
      estimated_at: string;
      guest_note?: string;
    }) => createOrderServiceForAdmin(payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");

      if (bookingRoomId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.bookingRooms.detail(bookingRoomId),
        });
      }

      setSelectedService(null);
      form.resetFields();
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const priceFormatter = useMemo(() => {
    const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    });
  }, [locale]);

  const formatDiscountBadge = (
    discountType?: ServiceDiscountType,
    discountValue?: number,
  ) => {
    if (discountType === "percent" && typeof discountValue === "number") {
      return `-${discountValue}%`;
    }

    if (discountType === "amount" && typeof discountValue === "number") {
      return `-${priceFormatter.format(discountValue)}`;
    }

    return "";
  };

  const serviceTypeOptions = useMemo<ServiceTypeOption[]>(
    () =>
      (serviceTypeOptionsRes?.data?.data?.service_types || [])
        .map((serviceType) => {
          const value = String(serviceType.id || "").trim();
          if (!value) return null;

          return {
            value,
            label: serviceType.name || `#${value}`,
          };
        })
        .filter((option): option is ServiceTypeOption => Boolean(option)),
    [serviceTypeOptionsRes?.data?.data?.service_types],
  );

  const serviceTypeCatalog = useMemo<ServiceTypeCatalogItem[]>(() => {
    const untitledType = t(
      "detailPage.bookingRoomDetailsModal.serviceOrderModal.untitledType",
    );
    const untitledService = t(
      "detailPage.bookingRoomDetailsModal.serviceOrderModal.untitledService",
    );
    const result: ServiceTypeCatalogItem[] = [];

    for (const serviceType of serviceTypesRes?.data?.data?.service_types ||
      []) {
      const serviceTypeId = String(serviceType.id || "").trim();
      if (!serviceTypeId) continue;

      const serviceTypeName =
        serviceType.name?.trim() || `${untitledType} #${serviceTypeId}`;

      const services: ServiceCatalogItem[] = [];
      for (const service of serviceType.services || []) {
        const serviceId = String(service.id || "").trim();
        if (!serviceId) continue;

        services.push({
          id: serviceId,
          name: service.name?.trim() || `${untitledService} #${serviceId}`,
          price: toPriceNumber(service.price as unknown),
          discount_type: service.discount_type,
          discount_value: toPriceNumber(service.discount_value as unknown),
          discount_start_at: service.discount_start_at,
          discount_end_at: service.discount_end_at,
          thumbnailUrl: resolvePublicImageUrl(
            service.thumbnail?.key || undefined,
          ),
          serviceTypeName,
        });
      }

      result.push({
        id: serviceTypeId,
        name: serviceTypeName,
        services,
      });
    }

    return result;
  }, [serviceTypesRes?.data?.data?.service_types, t]);

  const selectedServiceDetail = useMemo(
    () => getServiceFromResponse(selectedServiceDetailRes?.data?.data),
    [selectedServiceDetailRes?.data?.data],
  );

  const selectedServiceName =
    selectedServiceDetail?.name ||
    selectedService?.name ||
    t("detailPage.bookingRoomDetailsModal.serviceOrderModal.untitledService");

  const selectedServiceTypeName =
    selectedServiceDetail?.service_type?.name ||
    selectedService?.serviceTypeName;

  const selectedServiceDiscountSource = {
    discount_type:
      selectedServiceDetail?.discount_type ?? selectedService?.discount_type,
    discount_value:
      toPriceNumber(selectedServiceDetail?.discount_value) ??
      selectedService?.discount_value,
    discount_start_at:
      selectedServiceDetail?.discount_start_at ??
      selectedService?.discount_start_at,
    discount_end_at:
      selectedServiceDetail?.discount_end_at ??
      selectedService?.discount_end_at,
  };

  const selectedServiceDiscountMeta = getServiceDiscountMeta(
    selectedServiceDiscountSource,
  );
  const isSelectedServiceDiscountActive = isServiceDiscountActive(
    selectedServiceDiscountSource,
  );

  const selectedServicePrice =
    toPriceNumber(selectedServiceDetail?.price) ?? selectedService?.price;
  const selectedServiceDisplayPrice = getServiceDiscountedPrice(
    selectedServicePrice,
    selectedServiceDiscountSource,
  );
  const selectedServiceDiscountBadge = formatDiscountBadge(
    selectedServiceDiscountMeta?.type,
    selectedServiceDiscountMeta?.value,
  );

  const selectedServiceThumbnail = getServiceThumbnailUrl(
    selectedServiceDetail,
    selectedService?.thumbnailUrl,
  );

  const totalPrice =
    typeof selectedServiceDisplayPrice === "number" &&
    typeof watchedQuantity === "number" &&
    watchedQuantity > 0
      ? selectedServiceDisplayPrice * watchedQuantity
      : undefined;

  const hasServiceData = serviceTypeCatalog.some(
    (serviceType) => serviceType.services.length > 0,
  );
  const isFiltering = Boolean(appliedSearch || serviceTypeIdFilter);

  const isCreatingOrderService = createOrderServiceMutation.isPending;

  const handleSelectService = (service: ServiceCatalogItem) => {
    if (!bookingRoomId) return;

    setSelectedService(service);
    form.setFieldsValue({
      quantity: 1,
      estimated_at: dayjs(),
      guest_note: undefined,
    });
  };

  const handleBackToList = () => {
    if (isCreatingOrderService) return;

    setSelectedService(null);
    form.resetFields();
  };

  const handleClose = () => {
    if (isCreatingOrderService) return;

    setSearchValue("");
    setAppliedSearch("");
    setServiceTypeIdFilter(undefined);
    setSelectedService(null);
    form.resetFields();
    onClose();
  };

  const handleSubmitOrderService = async () => {
    if (!bookingRoomId || !selectedService?.id || isCreatingOrderService)
      return;

    const values = await form.validateFields();
    if (!values.estimated_at || !values.quantity) return;

    const guestNote = values.guest_note?.trim();

    createOrderServiceMutation.mutate({
      booking_room_id: bookingRoomId,
      service_id: selectedService.id,
      quantity: values.quantity,
      estimated_at: values.estimated_at.format("YYYY-MM-DDTHH:mm:ssZ"),
      guest_note: guestNote || undefined,
    });
  };

  const renderServiceList = () => (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder={t(
            "detailPage.bookingRoomDetailsModal.serviceOrderModal.filters.searchPlaceholder",
          )}
          className="w-full min-w-0 flex-1 text-sm! sm:min-w-[260px] sm:max-w-[420px]"
          size="large"
          prefix={<FiSearch className="text-[#9CA3AF]" />}
          allowClear
        />

        <Select
          size="large"
          allowClear
          placeholder={t(
            "detailPage.bookingRoomDetailsModal.serviceOrderModal.filters.serviceTypePlaceholder",
          )}
          value={serviceTypeIdFilter}
          onChange={(value) => setServiceTypeIdFilter(value)}
          options={serviceTypeOptions}
          className="w-full min-w-0 text-sm! sm:min-w-[240px] sm:w-auto"
          disabled={loadingServiceTypeOptions}
        />
      </div>

      <Spin spinning={loadingServiceTypes} size="large">
        {hasServiceData ? (
          <div className="max-h-[62vh] space-y-6 overflow-y-auto pr-1">
            {serviceTypeCatalog.map((serviceType) => (
              <section key={serviceType.id}>
                <h3 className="mb-3 text-base font-semibold text-gray-900">
                  {serviceType.name}
                </h3>

                {serviceType.services.length > 0 ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-1">
                    {serviceType.services.map((service) => {
                      const discountMeta = getServiceDiscountMeta(service);
                      const discountBadge = formatDiscountBadge(
                        discountMeta?.type,
                        discountMeta?.value,
                      );
                      const discountActive = isServiceDiscountActive(service);
                      const displayPrice = getServiceDiscountedPrice(
                        service.price,
                        service,
                      );
                      const showDiscountEffect =
                        discountActive &&
                        typeof service.price === "number" &&
                        typeof displayPrice === "number" &&
                        displayPrice < service.price;

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleSelectService(service)}
                          className="w-full cursor-pointer overflow-hidden rounded-lg border border-gray-200 shadow-sm p-1 bg-white text-left transition hover:border-gray-300 hover:shadow-sm sm:w-[220px] sm:flex-shrink-0"
                        >
                          <div className="relative h-32 w-full overflow-hidden rounded-md bg-gray-100">
                            {discountMeta ? (
                              <span className="absolute left-2 top-2 z-[2] rounded-full bg-[#111827] px-2 py-0.5 text-[11px] font-semibold text-white">
                                {discountBadge}
                              </span>
                            ) : null}

                            {service.thumbnailUrl ? (
                              <Image
                                src={service.thumbnailUrl}
                                alt={service.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 220px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-500">
                                {t(
                                  "detailPage.bookingRoomDetailsModal.serviceOrderModal.noThumbnail",
                                )}
                              </div>
                            )}
                          </div>

                          <div className="relative z-[1] p-3">
                            <p className="text-sm font-medium leading-5 text-gray-900 break-words">
                              {service.name}
                            </p>
                            <div className="flex justify-between items-center">
                              <p className="mt-1 text-sm font-semibold text-[#171717]">
                                {typeof displayPrice === "number"
                                  ? priceFormatter.format(displayPrice)
                                  : "-"}
                              </p>

                              {showDiscountEffect ? (
                                <p className="mt-0.5 text-xs text-gray-500 line-through">
                                  {typeof service.price === "number"
                                    ? priceFormatter.format(service.price)
                                    : "-"}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-gray-200 bg-[#fafafa] px-4 py-3 text-sm text-gray-500">
                    {t(
                      "detailPage.bookingRoomDetailsModal.serviceOrderModal.emptyByType",
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="py-16">
            <Empty
              description={t(
                isFiltering
                  ? "detailPage.bookingRoomDetailsModal.serviceOrderModal.emptyWithFilters"
                  : "detailPage.bookingRoomDetailsModal.serviceOrderModal.empty",
              )}
            />
          </div>
        )}
      </Spin>
    </>
  );

  const renderServiceOrderForm = () => (
    <>
      <button
        type="button"
        onClick={handleBackToList}
        disabled={isCreatingOrderService}
        className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-500 transition hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <BsChevronLeft className="h-3 w-3" />
        {t(
          "detailPage.bookingRoomDetailsModal.serviceOrderModal.actions.backToList",
        )}
      </button>

      <Spin spinning={loadingServiceDetail} size="large">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white pb-3 sm:p-4">
            <div className="relative h-56 w-full overflow-hidden rounded-md bg-gray-100 sm:h-72">
              {selectedServiceDiscountMeta ? (
                <span className="absolute left-3 top-3 z-[2] rounded-full bg-[#111827] px-2.5 py-1 text-xs font-semibold text-white">
                  {selectedServiceDiscountBadge}
                </span>
              ) : null}

              {selectedServiceThumbnail ? (
                <Image
                  src={selectedServiceThumbnail}
                  alt={selectedServiceName}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-500">
                  {t(
                    "detailPage.bookingRoomDetailsModal.serviceOrderModal.noThumbnail",
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-end md:px-0 px-3">
              <div>
                <p className="mt-3 text-base font-semibold text-gray-900 break-words">
                  {selectedServiceName}
                </p>

                {selectedServiceTypeName ? (
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedServiceTypeName}
                  </p>
                ) : null}
              </div>
              <div className="mt-2 text-right">
                <p className="text-sm font-semibold text-[#171717]">
                  {typeof selectedServiceDisplayPrice === "number"
                    ? priceFormatter.format(selectedServiceDisplayPrice)
                    : "-"}
                </p>
                {isSelectedServiceDiscountActive &&
                typeof selectedServicePrice === "number" &&
                typeof selectedServiceDisplayPrice === "number" &&
                selectedServiceDisplayPrice < selectedServicePrice ? (
                  <p className="text-xs text-gray-500 line-through">
                    {priceFormatter.format(selectedServicePrice)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
            <Form form={form} layout="vertical" requiredMark={false}>
              <Form.Item
                name="quantity"
                className="mb-3"
                label={
                  <span className="text-sm font-medium">
                    {t(
                      "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.fields.quantity",
                    )}
                    <span className="text-red-500"> *</span>
                  </span>
                }
                rules={[
                  {
                    validator: (_, value: number | null | undefined) => {
                      if (value == null || value === 0) {
                        return Promise.reject(
                          new Error(
                            validation.required(
                              t(
                                "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.fields.quantity",
                              ),
                            ),
                          ),
                        );
                      }

                      if (value <= 0) {
                        return Promise.reject(
                          new Error(
                            validation.greaterThanZero(
                              t(
                                "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.fields.quantity",
                              ),
                            ),
                          ),
                        );
                      }

                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  step={1}
                  controls={false}
                  precision={0}
                  placeholder={t(
                    "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.placeholders.quantity",
                  )}
                  className="w-full! shadow-sm rounded-lg text-sm transition focus-within:ring-2"
                  classNames={{
                    input: "px-3 !py-2 !text-sm bg-white h-[39.33px]!",
                  }}
                />
              </Form.Item>

              <div className="mb-3 rounded-md border border-gray-200 bg-[#fafafa] px-3 py-2">
                <p className="text-xs font-medium text-gray-500">
                  {t(
                    "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.fields.totalPrice",
                  )}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#171717]">
                  {typeof totalPrice === "number"
                    ? priceFormatter.format(totalPrice)
                    : "-"}
                </p>
              </div>

              <Form.Item
                name="estimated_at"
                className="mb-3"
                label={
                  <span className="text-sm font-medium">
                    {t(
                      "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.fields.estimatedAt",
                    )}
                    <span className="text-red-500"> *</span>
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: validation.required(
                      t(
                        "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.fields.estimatedAt",
                      ),
                    ),
                  },
                ]}
              >
                <DatePicker
                  showTime={{
                    format: "HH:mm",
                    showSecond: false,
                    showNow: false,
                  }}
                  format="DD/MM/YYYY HH:mm"
                  placeholder={t(
                    "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.placeholders.estimatedAt",
                  )}
                  className={inputClassName}
                />
              </Form.Item>

              <Form.Item
                name="guest_note"
                className="mb-0"
                label={
                  <span className="text-sm font-medium">
                    {t(
                      "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.fields.guestNote",
                    )}
                  </span>
                }
                rules={[
                  {
                    validator: (_, value?: string) => {
                      if (value == null || value === "")
                        return Promise.resolve();
                      if (value.trim().length > 0) return Promise.resolve();

                      return Promise.reject(
                        new Error(
                          t(
                            "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.validation.guestNoteMin",
                          ),
                        ),
                      );
                    },
                  },
                ]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={t(
                    "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.placeholders.guestNote",
                  )}
                  className={inputClassName}
                />
              </Form.Item>
            </Form>
          </div>
        </div>
      </Spin>
    </>
  );

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      destroyOnHidden
      width="min(1080px, calc(100vw - 24px))"
      styles={{
        header: { marginBottom: 8 },
        body: { paddingTop: 8, paddingBottom: 20 },
      }}
      title={
        <div className="pr-10">
          <h2 className="text-xl font-bold text-[#171717]">
            {selectedService
              ? t(
                  "detailPage.bookingRoomDetailsModal.serviceOrderModal.form.title",
                )
              : t("detailPage.bookingRoomDetailsModal.serviceOrderModal.title")}
          </h2>
        </div>
      }
    >
      {selectedService ? renderServiceOrderForm() : renderServiceList()}

      {selectedService ? (
        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              void handleSubmitOrderService();
            }}
            disabled={isCreatingOrderService || !bookingRoomId}
            className="w-full rounded-md bg-[#0a0a0a] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {isCreatingOrderService
              ? t(
                  "detailPage.bookingRoomDetailsModal.serviceOrderModal.actions.processing",
                )
              : t(
                  "detailPage.bookingRoomDetailsModal.serviceOrderModal.actions.create",
                )}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}

"use client";

import { getTenantSettings, updateTenantSettings } from "@/apis/tenant";
import { queryKeys } from "@/constants/query-keys";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useMessage } from "@/providers/MessageProvider";
import type { UpdateTenantSettingsRequest } from "@/types/request/tenant";
import type { TenantSettings } from "@/types/data/tenant";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Modal, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type EmailBookingFieldKey = keyof UpdateTenantSettingsRequest["email_booking"];
type EmailCancelFieldKey = keyof UpdateTenantSettingsRequest["email_cancel"];

interface TenantSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface TenantSettingsFormValues {
  imap: {
    host: string;
    port: string;
    user: string;
    password: string;
  };
  email_booking: Record<EmailBookingFieldKey, string>;
  email_cancel: Record<EmailCancelFieldKey, string>;
}

interface BindingErrorData {
  field?: string;
  tag?: string;
  param?: string;
}

interface FormFieldError {
  name: string[];
  errors: string[];
}

const EMAIL_BOOKING_FIELDS: Array<{
  key: EmailBookingFieldKey;
  translationKey: string;
}> = [
  {
    key: "subject",
    translationKey: "subject",
  },
  {
    key: "booking_number",
    translationKey: "bookingNumber",
  },
  {
    key: "guest",
    translationKey: "guest",
  },
  {
    key: "check_in",
    translationKey: "checkIn",
  },
  {
    key: "check_out",
    translationKey: "checkOut",
  },
  {
    key: "booked_on",
    translationKey: "bookedOn",
  },
  {
    key: "rooms_booked",
    translationKey: "roomsBooked",
  },
  {
    key: "source",
    translationKey: "source",
  },
  {
    key: "total_net_price",
    translationKey: "totalNetPrice",
  },
  {
    key: "total_sell_price",
    translationKey: "totalSellPrice",
  },
  {
    key: "guest_number",
    translationKey: "guestNumber",
  },
  {
    key: "room_number",
    translationKey: "roomNumber",
  },
  {
    key: "promotion_name",
    translationKey: "promotionName",
  },
  {
    key: "meal_plan",
    translationKey: "mealPlan",
  },
  {
    key: "booking_conditions",
    translationKey: "bookingConditions",
  },
  {
    key: "booking_preferences",
    translationKey: "bookingPreferences",
  },
];

const EMAIL_CANCEL_FIELDS: Array<{
  key: EmailCancelFieldKey;
  translationKey: string;
}> = [
  {
    key: "subject",
    translationKey: "subject",
  },
  {
    key: "bodies",
    translationKey: "bodies",
  },
];

const serializePatternList = (value?: string[]) => (value || []).join("\n");

const parsePatternList = (value?: string) =>
  (value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const isIntegerString = (value: string) => /^-?\d+$/.test(value);

const createEmptyFormValues = (): TenantSettingsFormValues => ({
  imap: {
    host: "",
    port: "",
    user: "",
    password: "",
  },
  email_booking: {
    subject: "",
    booking_number: "",
    guest: "",
    check_in: "",
    check_out: "",
    booked_on: "",
    rooms_booked: "",
    source: "",
    total_net_price: "",
    total_sell_price: "",
    guest_number: "",
    room_number: "",
    promotion_name: "",
    meal_plan: "",
    booking_conditions: "",
    booking_preferences: "",
  },
  email_cancel: {
    subject: "",
    bodies: "",
  },
});

const toFormValues = (settings?: TenantSettings): TenantSettingsFormValues => ({
  imap: {
    host: settings?.imap?.host || "",
    port:
      settings?.imap?.port && settings.imap.port > 0
        ? String(settings.imap.port)
        : "",
    user: settings?.imap?.user || "",
    password: "",
  },
  email_booking: {
    subject: serializePatternList(settings?.email_booking?.subject),
    booking_number: serializePatternList(
      settings?.email_booking?.booking_number,
    ),
    guest: serializePatternList(settings?.email_booking?.guest),
    check_in: serializePatternList(settings?.email_booking?.check_in),
    check_out: serializePatternList(settings?.email_booking?.check_out),
    booked_on: serializePatternList(settings?.email_booking?.booked_on),
    rooms_booked: serializePatternList(settings?.email_booking?.rooms_booked),
    source: serializePatternList(settings?.email_booking?.source),
    total_net_price: serializePatternList(
      settings?.email_booking?.total_net_price,
    ),
    total_sell_price: serializePatternList(
      settings?.email_booking?.total_sell_price,
    ),
    guest_number: serializePatternList(settings?.email_booking?.guest_number),
    room_number: serializePatternList(settings?.email_booking?.room_number),
    promotion_name: serializePatternList(
      settings?.email_booking?.promotion_name,
    ),
    meal_plan: serializePatternList(settings?.email_booking?.meal_plan),
    booking_conditions: serializePatternList(
      settings?.email_booking?.booking_conditions,
    ),
    booking_preferences: serializePatternList(
      settings?.email_booking?.booking_preferences,
    ),
  },
  email_cancel: {
    subject: serializePatternList(settings?.email_cancel?.subject),
    bodies: serializePatternList(settings?.email_cancel?.bodies),
  },
});

const toRequestPayload = (
  values?: Partial<TenantSettingsFormValues>,
): UpdateTenantSettingsRequest => {
  const portRaw = values?.imap?.port?.trim() || "";
  const portValue = portRaw
    ? isIntegerString(portRaw)
      ? Number(portRaw)
      : Number.NaN
    : 0;

  return {
    imap: {
      host: values?.imap?.host?.trim() || "",
      port: portValue,
      user: values?.imap?.user?.trim() || "",
      password: values?.imap?.password?.trim() || "",
    },
    email_booking: {
      subject: parsePatternList(values?.email_booking?.subject),
      booking_number: parsePatternList(values?.email_booking?.booking_number),
      guest: parsePatternList(values?.email_booking?.guest),
      check_in: parsePatternList(values?.email_booking?.check_in),
      check_out: parsePatternList(values?.email_booking?.check_out),
      booked_on: parsePatternList(values?.email_booking?.booked_on),
      rooms_booked: parsePatternList(values?.email_booking?.rooms_booked),
      source: parsePatternList(values?.email_booking?.source),
      total_net_price: parsePatternList(values?.email_booking?.total_net_price),
      total_sell_price: parsePatternList(
        values?.email_booking?.total_sell_price,
      ),
      guest_number: parsePatternList(values?.email_booking?.guest_number),
      room_number: parsePatternList(values?.email_booking?.room_number),
      promotion_name: parsePatternList(values?.email_booking?.promotion_name),
      meal_plan: parsePatternList(values?.email_booking?.meal_plan),
      booking_conditions: parsePatternList(
        values?.email_booking?.booking_conditions,
      ),
      booking_preferences: parsePatternList(
        values?.email_booking?.booking_preferences,
      ),
    },
    email_cancel: {
      subject: parsePatternList(values?.email_cancel?.subject),
      bodies: parsePatternList(values?.email_cancel?.bodies),
    },
  };
};

const toComparablePayload = (payload: UpdateTenantSettingsRequest) => ({
  ...payload,
  imap: {
    ...payload.imap,
    password: "",
  },
});

const extractBindingErrors = (payload: unknown): BindingErrorData[] => {
  if (!payload || typeof payload !== "object") return [];

  const apiData = (
    "response" in payload &&
    payload.response &&
    typeof payload.response === "object" &&
    "data" in payload.response
      ? payload.response.data
      : "data" in payload
        ? payload.data
        : null
  ) as unknown;

  if (Array.isArray(apiData)) {
    return apiData.filter(
      (item) => item && typeof item === "object",
    ) as BindingErrorData[];
  }

  if (
    apiData &&
    typeof apiData === "object" &&
    ("field" in apiData || "tag" in apiData || "param" in apiData)
  ) {
    return [apiData as BindingErrorData];
  }

  if (
    apiData &&
    typeof apiData === "object" &&
    "data" in apiData &&
    apiData.data &&
    typeof apiData.data === "object" &&
    ("field" in apiData.data ||
      "tag" in apiData.data ||
      "param" in apiData.data)
  ) {
    return [apiData.data as BindingErrorData];
  }

  return [];
};

export default function TenantSettingsModal({
  open,
  onClose,
}: TenantSettingsModalProps) {
  const t = useTranslations("SettingsPage");
  const validation = useValidationMessages();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<TenantSettingsFormValues>();
  const watchedValues = Form.useWatch([], form);

  const {
    data: settingsRes,
    error: settingsError,
    isFetching: isSettingsFetching,
  } = useQuery({
    queryKey: queryKeys.tenant.settings(),
    queryFn: async () => getTenantSettings(),
    enabled: open,
    staleTime: 300,
  });

  const settings = settingsRes?.data?.data?.settings;
  const hasSavedPassword = Boolean(settings?.imap?.has_password);
  const initialFormValues = useMemo(() => toFormValues(settings), [settings]);
  const initialPayload = useMemo(
    () => toRequestPayload(initialFormValues),
    [initialFormValues],
  );
  const currentPayload = useMemo(
    () => toRequestPayload(watchedValues || initialFormValues),
    [initialFormValues, watchedValues],
  );
  const hasSettingsChanges = useMemo(() => {
    if (currentPayload.imap.password) return true;

    return (
      JSON.stringify(toComparablePayload(currentPayload)) !==
      JSON.stringify(toComparablePayload(initialPayload))
    );
  }, [currentPayload, initialPayload]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(initialFormValues);
  }, [form, initialFormValues, open]);

  useEffect(() => {
    if (!open) return;
    if (!settingsError) return;
    messageApi.errorFromApi(settingsError, t("modal.errors.load"));
  }, [messageApi, open, settingsError, t]);

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateTenantSettingsRequest) =>
      updateTenantSettings(payload),
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
      queryClient.invalidateQueries({ queryKey: queryKeys.tenant.settings() });
      form.resetFields();
      onClose();
    },
    onError: (error) => {
      const bindingErrors = extractBindingErrors(error);

      if (bindingErrors.length > 0) {
        const fieldValidationKeyMap: Record<string, string> = {
          "imap.host": "imapHost",
          "imap.port": "imapPort",
          "imap.user": "imapUser",
          "imap.password": "imapPassword",
          "email_booking.subject": "emailBookingSubject",
          "email_booking.booking_number": "emailBookingBookingNumber",
          "email_booking.guest": "emailBookingGuest",
          "email_booking.check_in": "emailBookingCheckIn",
          "email_booking.check_out": "emailBookingCheckOut",
          "email_booking.booked_on": "emailBookingBookedOn",
          "email_booking.rooms_booked": "emailBookingRoomsBooked",
          "email_booking.source": "emailBookingSource",
          "email_booking.total_net_price": "emailBookingTotalNetPrice",
          "email_booking.total_sell_price": "emailBookingTotalSellPrice",
          "email_booking.guest_number": "emailBookingGuestNumber",
          "email_booking.room_number": "emailBookingRoomNumber",
          "email_booking.promotion_name": "emailBookingPromotionName",
          "email_booking.meal_plan": "emailBookingMealPlan",
          "email_booking.booking_conditions": "emailBookingBookingConditions",
          "email_booking.booking_preferences": "emailBookingBookingPreferences",
          "email_cancel.subject": "emailCancelSubject",
          "email_cancel.bodies": "emailCancelBodies",
        };

        const getFieldMessage = (item: BindingErrorData) => {
          if (item.field === "imap" && item.tag === "required_with") {
            return t("modal.errors.imapRequired");
          }

          const labelKey = item.field ? fieldValidationKeyMap[item.field] : "";
          const label = labelKey
            ? validation.field(labelKey)
            : t("modal.errors.unknownField");

          if (item.tag === "gt" && item.param === "0") {
            return validation.greaterThanZero(label);
          }

          return validation.required(label);
        };

        const mappedErrors = bindingErrors.flatMap((item) => {
          const errorMessage = getFieldMessage(item);

          if (item.field === "imap") {
            return [
              { name: ["imap", "host"], errors: [errorMessage] },
              { name: ["imap", "port"], errors: [errorMessage] },
              { name: ["imap", "user"], errors: [errorMessage] },
              { name: ["imap", "password"], errors: [errorMessage] },
            ];
          }

          if (!item.field) return [];

          return [{ name: item.field.split("."), errors: [errorMessage] }];
        });

        if (mappedErrors.length > 0) {
          form.setFields(mappedErrors as Parameters<typeof form.setFields>[0]);
          return;
        }
      }

      messageApi.errorFromApi(error, t("modal.errors.submit"));
    },
  });

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const validateAgainstBackendLogic = (
    values: TenantSettingsFormValues,
  ): FormFieldError[] => {
    const payload = toRequestPayload(values);
    const portRaw = values.imap.port.trim();
    const { host, port, user } = payload.imap;
    const effectivePassword =
      payload.imap.password || (hasSavedPassword ? "__saved__" : "");

    if (portRaw && !isIntegerString(portRaw)) {
      return [
        {
          name: ["imap", "port"],
          errors: [t("modal.errors.portInteger")],
        },
      ];
    }

    const hasAnyIMAP =
      host !== "" || user !== "" || effectivePassword !== "" || port !== 0;
    const hasAllIMAP =
      host !== "" && user !== "" && effectivePassword !== "" && port !== 0;
    const hasAnyEmailValue =
      Object.values(payload.email_booking).some((items) => items.length > 0) ||
      Object.values(payload.email_cancel).some((items) => items.length > 0);

    if (hasAnyIMAP) {
      if (host === "") {
        return [
          {
            name: ["imap", "host"],
            errors: [validation.required(validation.field("imapHost"))],
          },
        ];
      }

      if (port === 0) {
        return [
          {
            name: ["imap", "port"],
            errors: [validation.required(validation.field("imapPort"))],
          },
        ];
      }

      if (port < 0) {
        return [
          {
            name: ["imap", "port"],
            errors: [validation.greaterThanZero(validation.field("imapPort"))],
          },
        ];
      }

      if (user === "") {
        return [
          {
            name: ["imap", "user"],
            errors: [validation.required(validation.field("imapUser"))],
          },
        ];
      }

      if (effectivePassword === "") {
        return [
          {
            name: ["imap", "password"],
            errors: [validation.required(validation.field("imapPassword"))],
          },
        ];
      }
    } else if (port < 0) {
      return [
        {
          name: ["imap", "port"],
          errors: [validation.greaterThanZero(validation.field("imapPort"))],
        },
      ];
    }

    if (hasAnyEmailValue && !hasAllIMAP) {
      return [
        { name: ["imap", "host"], errors: [t("modal.errors.imapRequired")] },
        { name: ["imap", "port"], errors: [t("modal.errors.imapRequired")] },
        { name: ["imap", "user"], errors: [t("modal.errors.imapRequired")] },
        {
          name: ["imap", "password"],
          errors: [t("modal.errors.imapRequired")],
        },
      ];
    }

    return [];
  };

  const handleSubmit = async () => {
    if (updateMutation.isPending) return;
    if (!hasSettingsChanges) return;

    const values = await form.validateFields();
    form.setFields([
      { name: ["imap", "host"], errors: [] },
      { name: ["imap", "port"], errors: [] },
      { name: ["imap", "user"], errors: [] },
      { name: ["imap", "password"], errors: [] },
    ]);
    const fieldErrors = validateAgainstBackendLogic(values);

    if (fieldErrors.length > 0) {
      form.setFields(fieldErrors as Parameters<typeof form.setFields>[0]);
      return;
    }

    const payload = toRequestPayload(values);
    await updateMutation.mutateAsync(payload);
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      destroyOnHidden
      width="min(960px, calc(100vw - 24px))"
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 24 },
      }}
      title={
        <div className="pr-8">
          <span className="text-xl font-bold text-gray-800">
            {t("modal.title")}
          </span>
          <p className="mt-1 text-sm text-gray-500">{t("modal.description")}</p>
        </div>
      }
    >
      <Spin spinning={isSettingsFetching || updateMutation.isPending}>
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={createEmptyFormValues()}
            className="flex flex-col gap-5"
          >
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-800">
                  {t("modal.sections.imap.title")}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t("modal.sections.imap.description")}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Form.Item
                  name={["imap", "host"]}
                  label={
                    <span className="text-sm font-medium">
                      {t("modal.imap.host")}
                    </span>
                  }
                  className="mb-0"
                >
                  <Input
                    placeholder={t("modal.imap.hostPlaceholder")}
                    className="shadow-sm rounded-lg px-3! py-2! text-sm bg-white"
                  />
                </Form.Item>

                <Form.Item
                  name={["imap", "port"]}
                  label={
                    <span className="text-sm font-medium">
                      {t("modal.imap.port")}
                    </span>
                  }
                  className="mb-0"
                >
                  <Input
                    type="number"
                    min={1}
                    placeholder={t("modal.imap.portPlaceholder")}
                    className="shadow-sm rounded-lg px-3! py-2! text-sm bg-white"
                  />
                </Form.Item>

                <Form.Item
                  name={["imap", "user"]}
                  label={
                    <span className="text-sm font-medium">
                      {t("modal.imap.user")}
                    </span>
                  }
                  className="mb-0"
                >
                  <Input
                    placeholder={t("modal.imap.userPlaceholder")}
                    className="shadow-sm rounded-lg px-3! py-2! text-sm bg-white"
                  />
                </Form.Item>

                <Form.Item
                  name={["imap", "password"]}
                  label={
                    <span className="text-sm font-medium">
                      {t("modal.imap.password")}
                    </span>
                  }
                  extra={
                    hasSavedPassword
                      ? t("modal.imap.passwordSavedHint")
                      : t("modal.imap.passwordHint")
                  }
                  className="mb-0"
                >
                  <Input.Password
                    placeholder={t("modal.imap.passwordPlaceholder")}
                    iconRender={(visible) =>
                      visible ? <FaEye size={18} /> : <FaEyeSlash size={18} />
                    }
                    className="shadow-sm rounded-lg px-3! py-2! text-sm bg-white"
                  />
                </Form.Item>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-800">
                  {t("modal.sections.emailBooking.title")}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t("modal.patternHint")}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {EMAIL_BOOKING_FIELDS.map((field) => (
                  <Form.Item
                    key={field.key}
                    name={["email_booking", field.key]}
                    label={
                      <span className="text-sm font-medium">
                        {t(`modal.emailBooking.fields.${field.translationKey}`)}
                      </span>
                    }
                    className="mb-0"
                  >
                    <Input.TextArea
                      placeholder={t("modal.patternPlaceholder")}
                      autoSize={{ minRows: 2, maxRows: 5 }}
                      className="shadow-sm rounded-lg px-3! py-2! text-sm bg-white"
                    />
                  </Form.Item>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-800">
                  {t("modal.sections.emailCancel.title")}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t("modal.patternHint")}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {EMAIL_CANCEL_FIELDS.map((field) => (
                  <Form.Item
                    key={field.key}
                    name={["email_cancel", field.key]}
                    label={
                      <span className="text-sm font-medium">
                        {t(`modal.emailCancel.fields.${field.translationKey}`)}
                      </span>
                    }
                    className="mb-0"
                  >
                    <Input.TextArea
                      placeholder={t("modal.patternPlaceholder")}
                      autoSize={{ minRows: 2, maxRows: 5 }}
                      className="shadow-sm rounded-lg px-3! py-2! text-sm bg-white"
                    />
                  </Form.Item>
                ))}
              </div>
            </section>

            <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                {t("modal.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  updateMutation.isPending ||
                  isSettingsFetching ||
                  !hasSettingsChanges
                }
                className="w-full rounded-md bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {updateMutation.isPending
                  ? t("modal.submitting")
                  : t("modal.submit")}
              </button>
            </div>
          </Form>
        </div>
      </Spin>
    </Modal>
  );
}

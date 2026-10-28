"use client";

import { useEffect, useMemo } from "react";
import { Form, Input, Modal, Select } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { Floor } from "@/types/data/floor";
import { Room } from "@/types/data/room";
import FloorSelect from "./FloorSelect";

interface SelectOption {
  value: string;
  label: string;
}

export interface RoomFormValues {
  name: string;
  floor_id: string;
  room_type_id: string;
}

interface RoomModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  room?: Room;
  roomTypeOptions: SelectOption[];
  floors: Floor[];
  branchOptions: SelectOption[];
  submitting?: boolean;
  onSubmit?: (data: RoomFormValues) => void;
  onCreateFloor: (name: string, branchId: string) => Promise<Floor | null>;
  onUpdateFloor: (
    id: string,
    name: string,
    branchId: string,
  ) => Promise<boolean>;
  onDeleteFloor: (id: string) => Promise<boolean>;
}

export default function RoomModal({
  open,
  onClose,
  mode,
  room,
  roomTypeOptions,
  floors,
  branchOptions,
  submitting = false,
  onSubmit,
  onCreateFloor,
  onUpdateFloor,
  onDeleteFloor,
}: RoomModalProps) {
  const t = useTranslations("RoomsPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<RoomFormValues>();
  const watchedName = Form.useWatch("name", form);
  const watchedFloorId = Form.useWatch("floor_id", form);
  const watchedRoomTypeId = Form.useWatch("room_type_id", form);

  const hasChanges = useMemo(() => {
    if (mode !== "edit" || !room) return true;

    return (
      (watchedName || "") !== (room.name || "") ||
      (watchedFloorId || undefined) !== (room.floor?.id || undefined) ||
      (watchedRoomTypeId || undefined) !== (room.room_type?.id || undefined)
    );
  }, [mode, room, watchedFloorId, watchedName, watchedRoomTypeId]);

  const formatDateTime = (value?: string) => {
    if (!value) return "--";

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;

      return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return value;
    }
  };

  const getUserDisplayName = (user?: Room["created_by"]) => {
    if (!user) return "--";

    const fullName = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim();

    return fullName || user.username || user.email || "--";
  };

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && room) {
      form.setFieldsValue({
        name: room.name || "",
        floor_id: room.floor?.id,
        room_type_id: room.room_type?.id,
      });
      return;
    }

    form.resetFields();
  }, [mode, room, open, form]);

  useEffect(() => {
    if (!open) return;

    const selectedFloorId = form.getFieldValue("floor_id");
    if (!selectedFloorId) return;

    const isFloorAvailable = floors.some(
      (floor) => floor.id === selectedFloorId,
    );
    if (!isFloorAvailable) {
      form.setFieldValue("floor_id", undefined);
    }
  }, [floors, form, open]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!hasChanges) return;
    if (!onSubmit) return;
    const values = await form.validateFields();
    onSubmit(values);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="min(620px, calc(100vw - 24px))"
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 24 },
      }}
      title={
        <span className="text-xl font-bold text-gray-800">
          {t(`modal.title.${mode}`)}
        </span>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="flex flex-col gap-1"
      >
        <Form.Item
          name="name"
          label={
            <span className="text-gray-800 text-sm font-medium">
              {t("form.name")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("roomName")),
            },
            {
              min: 2,
              message: validation.minChars(validation.field("roomName"), 2),
            },
          ]}
        >
          <Input
            placeholder={t("form.namePlaceholder")}
            className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
          />
        </Form.Item>

        <Form.Item
          name="room_type_id"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.roomType")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("roomTypeName")),
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("form.roomTypePlaceholder")}
            options={roomTypeOptions}
            className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
          />
        </Form.Item>

        <Form.Item
          name="floor_id"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.floor")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("floor")),
            },
          ]}
        >
          <FloorSelect
            floors={floors}
            branchOptions={branchOptions}
            loading={submitting}
            onCreateFloor={onCreateFloor}
            onUpdateFloor={onUpdateFloor}
            onDeleteFloor={onDeleteFloor}
            labels={{
              placeholder: t("form.floorPlaceholder"),
              branchPlaceholder: t("floors.branchPlaceholder"),
              addPlaceholder: t("floors.addPlaceholder"),
              editPlaceholder: t("floors.editPlaceholder"),
              addButton: t("floors.add"),
              empty: t("floors.empty"),
              save: t("actions.save"),
              cancel: t("actions.cancel"),
              edit: t("actions.edit"),
              delete: t("actions.delete"),
              deleteTitle: t("floors.delete.title"),
              deleteDescription: t("floors.delete.description"),
              deleteConfirm: t("floors.delete.confirm"),
            }}
          />
        </Form.Item>

        {mode === "edit" && room && (
          <div className="mb-2 mt-4 rounded-lg bg-[#f5f5f5] p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-[#374151] mb-3">
              {t("meta.title")}
            </h4>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.createdBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(room.created_by)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">{t("meta.updatedBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(room.updated_by)}
                </p>
              </div>

              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.createdAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(room.created_at)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">{t("meta.updatedAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(room.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Form>

      <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="w-full px-6 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
        >
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          className="w-full px-6 py-2 rounded-md bg-[#8b5cf6] hover:bg-violet-600 active:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer sm:w-auto"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={submitting || !hasChanges}
        >
          {mode === "create" ? t("actions.create") : t("actions.save")}
        </button>
      </div>
    </Modal>
  );
}

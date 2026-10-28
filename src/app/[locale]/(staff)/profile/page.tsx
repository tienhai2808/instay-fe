"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getMe, updateInfo, changePassword } from "@/apis/auth";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { UpdateInforRequest } from "@/types/request/auth";
import { Form, Image, Input, Spin } from "antd";
import { User } from "@/types/data/user";
import { useMessage } from "@/providers/MessageProvider";
import { useRouter } from "next/navigation";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import { resolvePublicImageUrl } from "@/utils/media";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTranslations } from "next-intl";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/query-keys";
import Link from "next/link";

export default function ProfilePage() {
  const t = useTranslations("ProfilePage");

  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profileForm] = Form.useForm<UpdateInforRequest>();
  const watchedFirstName = Form.useWatch("first_name", profileForm);
  const watchedLastName = Form.useWatch("last_name", profileForm);
  const watchedEmail = Form.useWatch("email", profileForm);
  const watchedPhone = Form.useWatch("phone", profileForm);
  const messageApi = useMessage();
  const router = useRouter();
  const validation = useValidationMessages();
  const setAuthUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const {
    data: meRes,
    isFetching: isMeFetching,
    error: meError,
  } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => getMe(),
    staleTime: 300,
  });

  useEffect(() => {
    if (meError) {
      messageApi.errorFromApi(meError);
    }
  }, [meError, messageApi]);

  const meUser = useMemo<User | undefined>(
    () => meRes?.data?.data?.user,
    [meRes?.data?.data?.user],
  );

  useEffect(() => {
    if (!meUser) return;
    setAuthUser(meUser);
    profileForm.setFieldsValue({
      first_name: meUser.first_name || "",
      last_name: meUser.last_name || "",
      email: meUser.email || "",
      phone: meUser.phone || "",
    });
  }, [meUser, profileForm, setAuthUser]);

  useEffect(() => {
    if (!avatarPreview) return;
    return () => {
      URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const updateInfoMutation = useMutation({
    mutationFn: async (payload: UpdateInforRequest) => updateInfo(payload),
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: {
      old_password: string;
      new_password: string;
    }) => changePassword(payload),
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
      setIsChangePassOpen(false);
      router.push("/login");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const handleUpdateInfo = async (data: UpdateInforRequest) => {
    let uploadedAvatarKey: string | undefined;

    if (avatarFile) {
      const [uploaded] = await uploadFilesWithPresignedURLs([
        { file: avatarFile },
      ]);
      uploadedAvatarKey = uploaded.key;
    }

    const nextAvatar = avatarFile
      ? (uploadedAvatarKey ?? meUser?.avatar ?? null)
      : avatarRemoved
        ? null
        : (meUser?.avatar ?? null);

    const payload = { ...data, avatar: nextAvatar };
    await updateInfoMutation.mutateAsync(payload);

    if (meUser) {
      const nextUser = { ...meUser, ...payload, avatar: nextAvatar };
      setAuthUser(nextUser);
      queryClient.setQueryData(queryKeys.auth.me(), (previous: unknown) => {
        if (!previous || typeof previous !== "object") return previous;

        const record = previous as {
          data?: { data?: { user?: User } };
        };

        if (!record.data?.data) return previous;

        return {
          ...record,
          data: {
            ...record.data,
            data: {
              ...record.data.data,
              user: nextUser,
            },
          },
        };
      });
    }

    if (avatarFile) {
      setAvatarFile(null);
      setAvatarPreview(null);
    }
    if (avatarRemoved) {
      setAvatarRemoved(false);
      setAvatarPreview(null);
    }
  };

  const handleSubmitChangePassword = (values: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    changePasswordMutation.mutate({
      old_password: values.old_password,
      new_password: values.new_password,
    });
  };

  const handleSubmitInfo = async () => {
    if (!hasProfileChanges) return;

    try {
      const values = await profileForm.validateFields();
      await handleUpdateInfo(values);
    } catch {
      // antd form already renders validation messages inline
    }
  };

  const handlePickAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
    setAvatarRemoved(false);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    if (avatarFile && avatarPreview) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    if (meUser?.avatar) {
      setAvatarRemoved(true);
    }
  };

  const avatarSrc =
    avatarPreview ||
    (!avatarRemoved ? resolvePublicImageUrl(meUser?.avatar) : undefined);
  const showRemoveButton = Boolean(avatarSrc);
  const initials = `${meUser?.first_name?.charAt(0) || "U"}${
    meUser?.last_name?.charAt(0) || ""
  }`;
  const departmentName =
    meUser?.department?.name ||
    ((meUser as { department_name?: string } | undefined)?.department_name ??
      "");

  const hasProfileChanges = meUser
    ? (watchedFirstName || "") !== (meUser.first_name || "") ||
      (watchedLastName || "") !== (meUser.last_name || "") ||
      (watchedEmail || "") !== (meUser.email || "") ||
      (watchedPhone || "") !== (meUser.phone || "") ||
      Boolean(avatarFile) ||
      avatarRemoved
    : false;

  const loading = isMeFetching || updateInfoMutation.isPending;

  return (
    <div className="min-auto">
      <div className="mx-auto mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-black">{t("title")}</h1>
        </div>
        <button
          onClick={() => setIsChangePassOpen(true)}
          className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] active:bg-[#3d3d3d] sm:w-auto"
        >
          <BiEditAlt className="text-sm" />
          {t("changePassword")}
        </button>
      </div>

      <div className="mx-auto">
        <Spin spinning={loading} size="large">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex shrink-0 flex-col items-center gap-3 rounded-xl bg-[#fafafa] p-5 shadow-md sm:p-8 md:w-72">
                <div className="h-40 w-40 select-none overflow-hidden rounded-full bg-[#8b5cf6] text-3xl font-bold text-white shadow-md flex items-center justify-center sm:h-54 sm:w-54 sm:text-4xl">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      width={216}
                      height={216}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    onClick={handlePickAvatar}
                    className="cursor-pointer flex w-full items-center justify-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition hover:bg-gray-50 sm:w-auto"
                  >
                    <BiEditAlt className="text-sm text-blue-500" />{" "}
                    {t("editAvatar")}
                  </button>
                  <button
                    onClick={handleRemoveAvatar}
                    disabled={!showRemoveButton}
                    className={`flex w-full items-center justify-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition hover:bg-gray-50 sm:w-auto ${
                      showRemoveButton
                        ? "cursor-pointer"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <BiTrashAlt className="text-sm text-red-500" />{" "}
                    {t("deleteAvatar")}
                  </button>
                </div>

                <div className="text-center mt-1">
                  <div className="text-xl mb-4 mt-2 font-semibold">
                    {meUser?.first_name} {meUser?.last_name}
                  </div>
                  <span
                    className={`inline-block px-1 py-0.5 rounded-sm text-sm font-medium border ${
                      meUser?.is_active
                        ? "bg-emerald-50 text-emerald-600 border-emerald-300"
                        : "bg-red-50 text-red-500 border-red-300"
                    }`}
                  >
                    {meUser?.is_active ? t("active") : t("inactive")}
                  </span>
                </div>
              </div>

              <Form
                form={profileForm}
                layout="vertical"
                requiredMark={false}
                className="flex-1 flex flex-col gap-5 rounded-xl bg-[#fafafa] p-4 shadow-sm sm:p-6!"
              >
                <div className="">
                  <h2 className="text-sm font-semibold mb-4 tracking-wide">
                    {t("personalInfo")}
                  </h2>
                  <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                    <Form.Item
                      className="mb-0"
                      name="first_name"
                      label={
                        <span className="block text-sm font-medium">
                          {t("firstName")}
                        </span>
                      }
                      rules={[
                        {
                          required: true,
                          message: validation.required(
                            validation.field("firstName"),
                          ),
                        },
                      ]}
                    >
                      <Input className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition" />
                    </Form.Item>
                    <Form.Item
                      className="mb-0"
                      name="last_name"
                      label={
                        <span className="block text-sm font-medium">
                          {t("lastName")}
                        </span>
                      }
                      rules={[
                        {
                          required: true,
                          message: validation.required(
                            validation.field("lastName"),
                          ),
                        },
                      ]}
                    >
                      <Input className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition" />
                    </Form.Item>
                    <Form.Item
                      className="mb-0"
                      name="email"
                      label={
                        <span className="block text-sm font-medium">
                          {t("email")}
                        </span>
                      }
                      rules={[
                        {
                          required: true,
                          message: validation.required(
                            validation.field("email"),
                          ),
                        },
                        { type: "email", message: validation.invalidEmail() },
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

                <div className="">
                  <h2 className="text-sm font-semibold mb-4 tracking-wide">
                    {t("workInfo")}
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm mb-2 font-medium">
                        {t("staffCode")}
                      </label>
                      <input
                        type="text"
                        value={meUser?.id || ""}
                        readOnly
                        className="w-full shadow-sm rounded-lg px-3 py-2 text-sm bg-[#efefef] cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 font-medium">
                        {t("username")}
                      </label>
                      <input
                        type="text"
                        value={meUser?.username || ""}
                        readOnly
                        className="w-full shadow-sm rounded-lg px-3 py-2 text-sm bg-[#efefef] cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 font-medium">
                        {t("role")}
                      </label>
                      <input
                        type="text"
                        value={meUser?.role || ""}
                        readOnly
                        className="w-full shadow-sm rounded-lg px-3 py-2 text-sm bg-[#efefef] cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2 font-medium">
                        {t("department")}
                      </label>
                      <input
                        type="text"
                        value={departmentName}
                        readOnly
                        className="w-full shadow-sm rounded-lg px-3 py-2 text-sm bg-[#efefef] cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </Form>
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
                disabled={loading || !hasProfileChanges}
                className="w-full rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </Spin>
      </div>

      <ChangePasswordModal
        open={isChangePassOpen}
        loading={changePasswordMutation.isPending}
        onClose={() => setIsChangePassOpen(false)}
        onSubmit={handleSubmitChangePassword}
      />
    </div>
  );
}

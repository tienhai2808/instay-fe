"use client";

import { useEffect, useMemo, useState } from "react";
import { Spin } from "antd";
import type { UploadFile } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BsChevronLeft } from "react-icons/bs";
import { BiEditAlt } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBasicBranches } from "@/apis/branch";
import { getDepartments } from "@/apis/department";
import {
  deleteUser,
  getUserById,
  resetUserPassword,
  updateUser,
} from "@/apis/user";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import type { User } from "@/types/data/user";
import type { UpdateUserRequest } from "@/types/request/user";
import { resolvePublicImageUrl } from "@/utils/media";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import ResetStaffPasswordModal from "../components/ResetPasswordModal";
import StaffForm, {
  StaffBranchOption,
  StaffDepartmentOption,
  StaffFormSubmitPayload,
  StaffFormValues,
} from "../components/Form";

const getStaffFromResponse = (payload: unknown): User | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const candidate =
    "user" in record && record.user && typeof record.user === "object"
      ? record.user
      : payload;

  if (!candidate || typeof candidate !== "object") return null;

  const user = candidate as User;
  if (!user.id) return null;

  return user;
};

export default function StaffDetailsPage() {
  const t = useTranslations("StaffsPage");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  const staffId = useMemo(() => {
    const rawId = params?.id;
    if (Array.isArray(rawId)) return rawId[0];
    return rawId;
  }, [params]);

  const {
    data: departmentsRes,
    isFetching: isDepartmentsFetching,
    error: departmentsError,
  } = useQuery({
    queryKey: queryKeys.departments.basic(),
    queryFn: async () => getDepartments({ view: "basic" }),
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
    data: staffRes,
    isFetching: isStaffFetching,
    error: staffError,
  } = useQuery({
    queryKey: queryKeys.users.detail(staffId || ""),
    queryFn: async () => getUserById(staffId as string),
    enabled: Boolean(staffId),
    staleTime: 300,
  });

  useEffect(() => {
    if (departmentsError) {
      messageApi.errorFromApi(departmentsError);
    }
  }, [departmentsError, messageApi]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (staffError) {
      messageApi.errorFromApi(staffError);
    }
  }, [messageApi, staffError]);

  const staff = useMemo(
    () => getStaffFromResponse(staffRes?.data?.data),
    [staffRes?.data?.data],
  );

  useEffect(() => {
    if (!staffId) return;
    if (isStaffFetching) return;
    if (staffError) return;
    if (staff) return;

    messageApi.error(t("detailPage.errors.notFound"));
    router.replace("/staffs");
  }, [isStaffFetching, messageApi, router, staff, staffError, staffId, t]);

  const departmentOptions = useMemo<StaffDepartmentOption[]>(
    () =>
      (departmentsRes?.data?.data?.departments || []).map((department) => ({
        value: String(department.id),
        label: department.name || `#${department.id}`,
      })),
    [departmentsRes?.data?.data?.departments],
  );

  const branchOptions = useMemo<StaffBranchOption[]>(
    () =>
      (branchesRes?.data?.data?.branches || []).map((branch) => ({
        value: String(branch.id),
        label: branch.name || `#${branch.id}`,
      })),
    [branchesRes?.data?.data?.branches],
  );

  const initialValues = useMemo<Partial<StaffFormValues> | undefined>(() => {
    if (!staff) return undefined;

    return {
      first_name: staff.first_name || "",
      last_name: staff.last_name || "",
      username: staff.username || "",
      email: staff.email || "",
      phone: staff.phone || "",
      role: staff.role === "admin" ? "admin" : "staff",
      is_active: Boolean(staff.is_active),
      department_id: staff.department?.id
        ? String(staff.department.id)
        : undefined,
      branch_ids: (staff.branches || []).map((branch) => String(branch.id)),
    };
  }, [staff]);

  const initialAvatarFileList = useMemo<UploadFile[]>(() => {
    const avatarUrl = resolvePublicImageUrl(staff?.avatar);
    if (!avatarUrl) return [];

    return [
      {
        uid: `staff-avatar-${staff?.id || "preview"}`,
        name: "avatar",
        status: "done",
        url: avatarUrl,
      },
    ];
  }, [staff?.avatar, staff?.id]);

  const formKey = useMemo(() => {
    return `${staff?.id || "staff"}-${staff?.avatar || "no-avatar"}-${staff?.updated_at || ""}-${staff?.branches?.length || 0}`;
  }, [staff?.avatar, staff?.branches?.length, staff?.id, staff?.updated_at]);

  const updateMutation = useMutation({
    mutationFn: async (variables: { id: string; payload: UpdateUserRequest }) =>
      updateUser(variables.id, variables.payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(staffId || ""),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      ]);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteUser(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      router.replace("/staffs");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (variables: { id: string; new_password: string }) =>
      resetUserPassword(variables.id, {
        new_password: variables.new_password,
      }),
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
      setIsResetPasswordOpen(false);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const handleSubmit = async ({
    values,
    avatarFile,
    avatarRemoved,
  }: StaffFormSubmitPayload) => {
    if (!staffId) return;

    let avatarKey: string | undefined;

    if (avatarFile) {
      const [uploaded] = await uploadFilesWithPresignedURLs([
        { file: avatarFile },
      ]);
      avatarKey = uploaded?.key;
    }

    const payload: UpdateUserRequest = {
      username: values.username,
      email: values.email,
      phone: values.phone,
      role: values.role,
      is_active: values.is_active,
      first_name: values.first_name,
      last_name: values.last_name,
      department_id: values.department_id || undefined,
      branch_ids: values.branch_ids || [],
      avatar: avatarRemoved ? null : (staff?.avatar ?? null),
    };

    if (values.role === "admin") {
      payload.department_id = undefined;
    }

    if (avatarFile) {
      payload.avatar = avatarKey ?? staff?.avatar ?? null;
    }

    updateMutation.mutate({ id: staffId, payload });
  };

  const handleDelete = () => {
    if (!staffId) return;
    deleteMutation.mutate(staffId);
  };

  const handleResetPassword = (values: { new_password: string }) => {
    if (!staffId) return;

    resetPasswordMutation.mutate({
      id: staffId,
      new_password: values.new_password,
    });
  };

  const loading =
    isDepartmentsFetching || isBranchesFetching || isStaffFetching;

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/staffs"
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            {t("detailPage.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("detailPage.title")}</h1>
        </div>
        <button
          type="button"
          onClick={() => setIsResetPasswordOpen(true)}
          disabled={
            loading || updateMutation.isPending || deleteMutation.isPending
          }
          className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] active:bg-[#3d3d3d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <BiEditAlt className="text-sm" />
          {t("detailPage.resetPassword")}
        </button>
      </div>

      <div className="px-0 lg:px-16">
        <Spin spinning={loading} size="large">
          <StaffForm
            key={formKey}
            mode="edit"
            submitting={updateMutation.isPending}
            deleting={deleteMutation.isPending}
            departmentOptions={departmentOptions}
            branchOptions={branchOptions}
            branchLoading={isBranchesFetching}
            initialValues={initialValues}
            initialAvatarFileList={initialAvatarFileList}
            cancelHref="/staffs"
            meta={
              staff
                ? {
                    created_by: staff.created_by,
                    updated_by: staff.updated_by,
                    created_at: staff.created_at,
                    updated_at: staff.updated_at,
                  }
                : undefined
            }
            onDelete={handleDelete}
            onSubmit={handleSubmit}
          />
        </Spin>
      </div>

      <ResetStaffPasswordModal
        open={isResetPasswordOpen}
        loading={resetPasswordMutation.isPending}
        onClose={() => setIsResetPasswordOpen(false)}
        onSubmit={handleResetPassword}
      />
    </div>
  );
}

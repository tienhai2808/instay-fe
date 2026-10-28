"use client";

import { Spin } from "antd";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { BsChevronLeft } from "react-icons/bs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBasicBranches } from "@/apis/branch";
import { getDepartments } from "@/apis/department";
import { createUser } from "@/apis/user";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import { CreateUserRequest } from "@/types/request/user";
import StaffForm, {
  StaffBranchOption,
  StaffDepartmentOption,
  StaffFormSubmitPayload,
} from "../components/Form";
import { useEffect, useMemo } from "react";

export default function CreateStaffPage() {
  const t = useTranslations("StaffsPage");
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const {
    data: departmentsRes,
    isFetching: loadingDepartments,
    error: departmentsError,
  } = useQuery({
    queryKey: queryKeys.departments.basic(),
    queryFn: async () => getDepartments({ view: "basic" }),
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
    if (departmentsError) {
      messageApi.errorFromApi(departmentsError);
    }
  }, [departmentsError, messageApi]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateUserRequest) => createUser(payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      router.push(`/staffs/${res.data.data.id}`);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

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

  const handleCancel = () => {
    router.push("/staffs");
  };

  const handleCreate = async ({
    values,
    avatarFile,
  }: StaffFormSubmitPayload) => {
    if (!values.password) return;

    let avatarKey: string | undefined;

    if (avatarFile) {
      const [uploaded] = await uploadFilesWithPresignedURLs([
        { file: avatarFile },
      ]);
      avatarKey = uploaded?.key;
    }

    const payload: CreateUserRequest = {
      username: values.username,
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: values.role,
      is_active: values.is_active,
      first_name: values.first_name,
      last_name: values.last_name,
      department_id: values.department_id || undefined,
      branch_ids: values.branch_ids || [],
      ...(avatarKey ? { avatar: avatarKey } : {}),
    };

    createMutation.mutate(payload);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex justify-between items-start text-black">
        <div>
          <Link
            href="/staffs"
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            Quay lại
          </Link>
          <h1 className="text-xl font-bold">{t("createPage.title")}</h1>
        </div>
      </div>

      <div className="px-0 lg:px-16">
        <Spin spinning={loadingDepartments || loadingBranches} size="large">
          <StaffForm
            mode="create"
            submitting={createMutation.isPending}
            departmentOptions={departmentOptions}
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

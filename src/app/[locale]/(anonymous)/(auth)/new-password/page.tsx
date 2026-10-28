"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/apis/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaInfoCircle,
  FaLock,
} from "react-icons/fa";
import { Button, Form, Input } from "antd";
import { useMessage } from "@/providers/MessageProvider";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";

export default function NewPasswordPage() {
  const t = useTranslations("NewPasswordPage");
  const router = useRouter();
  const [form] = Form.useForm();
  const { resetPasswordToken } = useAuthStore();
  const messageApi = useMessage();
  const validation = useValidationMessages();

  const resetPasswordMutation = useMutation({
    mutationFn: async (values: {
      new_password: string;
      confirm_password: string;
    }) =>
      resetPassword({
        new_password: values.new_password,
        reset_password_token: resetPasswordToken,
      }),
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
      setTimeout(() => router.push("/login"), 1500);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  useEffect(() => {
    if (!resetPasswordToken) {
      router.replace("/forgot-password");
    }
  }, [resetPasswordToken, router]);

  const handleSubmit = (values: {
    new_password: string;
    confirm_password: string;
  }) => {
    resetPasswordMutation.mutate(values);
  };

  return (
    <div className="w-full rounded-2xl bg-white p-5 shadow-[0px_25px_50px_0px_#608DBC33] sm:p-8 lg:p-10">
      <div className="mb-6 flex justify-center sm:mb-8">
        <Image
          src="/logo-dark.svg"
          alt="Instay Logo"
          width={240}
          height={60}
          priority
        />
      </div>

      <h2 className="mb-2 text-center text-[24px] font-bold text-[#111827] sm:text-[28px]">
        {t("title")}
      </h2>
      <p className="mb-6 text-center text-sm text-[#6B7280] sm:mb-8 sm:text-base">
        {t("subtitle")}
      </p>

      <div className="mb-6 flex items-start justify-center gap-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-[14px] leading-relaxed text-[#155DFC] sm:mb-8">
        <FaInfoCircle className="text-lg mt-0.5 text-[#155DFC]" />
        <p>{t("hint")}</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="flex flex-col"
      >
        <Form.Item
          name="new_password"
          rules={[
            {
              required: true,
              message: validation.required(validation.field("newPassword")),
            },
            {
              min: 6,
              message: validation.minChars(validation.field("newPassword"), 6),
            },
          ]}
          className="mb-4"
        >
          <Input.Password
            placeholder={t("newPasswordPlaceholder")}
            disabled={resetPasswordMutation.isPending}
            prefix={<FaLock className="text-[#6B7280] mr-2" />}
            className="w-full h-12 text-base! px-4! border border-[#E5E7EB] rounded-lg placeholder:text-[#9CA3AF] bg-[#F8FAFC]!"
            iconRender={(visible) =>
              visible ? (
                <FaEye style={{ color: "#9CA3AF" }} className="ml-2" />
              ) : (
                <FaEyeSlash style={{ color: "#9CA3AF" }} className="ml-2" />
              )
            }
          />
        </Form.Item>

        <Form.Item
          name="confirm_password"
          dependencies={["new_password"]}
          rules={[
            {
              required: true,
              message: validation.required(validation.field("confirmPassword")),
            },
            {
              min: 6,
              message: validation.minChars(
                validation.field("confirmPassword"),
                6,
              ),
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("new_password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(validation.passwordMismatch()));
              },
            }),
          ]}
          className="mb-8 sm:mb-10"
        >
          <Input.Password
            placeholder={t("confirmPasswordPlaceholder")}
            disabled={resetPasswordMutation.isPending}
            prefix={<FaLock className="text-[#6B7280] mr-2" />}
            className="w-full h-12 text-base! px-4! border border-[#E5E7EB] rounded-lg placeholder:text-[#9CA3AF] bg-[#F8FAFC]!"
            iconRender={(visible) =>
              visible ? (
                <FaEye style={{ color: "#9CA3AF" }} className="ml-2" />
              ) : (
                <FaEyeSlash style={{ color: "#9CA3AF" }} className="ml-2" />
              )
            }
          />
        </Form.Item>

        <Button
          htmlType="submit"
          type="primary"
          loading={resetPasswordMutation.isPending}
          className="w-full text-lg! h-12! gap-3! rounded-lg bg-[#155DFC]! border-none! text-white! font-semibold! flex items-center justify-center"
          style={{
            boxShadow: "0px 4px 15px 0px #608DBC4D",
          }}
        >
          {!resetPasswordMutation.isPending && (
            <FaCheckCircle className="text-xl" />
          )}
          {t("submit")}
        </Button>
      </Form>
    </div>
  );
}

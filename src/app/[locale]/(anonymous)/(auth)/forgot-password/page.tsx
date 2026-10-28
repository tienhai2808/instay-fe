"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaInfoCircle, FaPaperPlane } from "react-icons/fa";
import { Button, Form, Input } from "antd";
import { sendOtp } from "@/apis/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMessage } from "@/providers/MessageProvider";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useTranslations } from "next-intl";
import { TbMailFilled } from "react-icons/tb";
import { useMutation } from "@tanstack/react-query";

export default function ForgotPasswordPage() {
  const t = useTranslations("ForgotPasswordPage");
  const router = useRouter();
  const [form] = Form.useForm();
  const messageApi = useMessage();
  const validation = useValidationMessages();

  const { setForgotPasswordToken } = useAuthStore();

  const sendOtpMutation = useMutation({
    mutationFn: async (values: { email: string }) => sendOtp(values),
    onSuccess: (res) => {
      setForgotPasswordToken(res?.data.data.forgot_password_token);
      messageApi.fromApi(res?.data, "success");
      router.push("/forgot-password/verify");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const onFinish = (values: { email: string }) => {
    sendOtpMutation.mutate(values);
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

      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        className="flex flex-col"
      >
        <Form.Item
          name="email"
          rules={[
            {
              required: true,
              message: validation.required(validation.field("email")),
            },
            { type: "email", message: validation.invalidEmail() },
          ]}
          className="mb-5"
        >
          <Input
            suffix={<TbMailFilled className="text-[#9CA3AF] ml-2" />}
            prefix={<TbMailFilled className="text-[#6B7280] mr-2" />}
            placeholder={t("emailPlaceholder")}
            disabled={sendOtpMutation.isPending}
            className="w-full h-12 text-base! px-4! border border-[#E5E7EB] rounded-lg placeholder:text-[#9CA3AF] bg-[#F8FAFC]!"
          />
        </Form.Item>

        <div className="mb-8 flex items-start justify-start gap-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-4 text-[14px] leading-relaxed text-[#155DFC] sm:mb-10">
          <FaInfoCircle className="mt-1 text-[#155DFC]" />
          <p>{t("hint")}</p>
        </div>

        <Button
          htmlType="submit"
          type="primary"
          loading={sendOtpMutation.isPending}
          className="w-full mb-4 text-lg! h-12! gap-3! rounded-lg bg-[#155DFC]! border-none! text-white! font-semibold! flex items-center justify-center"
          style={{
            boxShadow: "0px 4px 15px 0px #608DBC4D",
          }}
        >
          {!sendOtpMutation.isPending && <FaPaperPlane className="text-xl" />}{" "}
          {t("submit")}
        </Button>

        <Button
          type="default"
          onClick={() => router.push("/login")}
          className="w-full h-12! text-lg! rounded-lg border border-[#608DBC]! text-[#608DBC]! font-semibold! bg-white hover:bg-[#EFF6FF]! transition-colors flex items-center justify-center gap-3"
        >
          <FaArrowLeft className="text-xl" /> {t("backToLogin")}
        </Button>
      </Form>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { login } from "@/apis/auth";
import { FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import { Button, Form, Input, Checkbox } from "antd";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useTranslations } from "next-intl";
import { FaRightToBracket } from "react-icons/fa6";
import { useMutation } from "@tanstack/react-query";
import {
  createAuthzSnapshot,
  getDefaultRouteForSnapshot,
} from "@/utils/access-control";
import { switchToStaffSession } from "@/utils/auth-session";

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  const [form] = Form.useForm();
  const messageApi = useMessage();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const validation = useValidationMessages();

  const loginMutation = useMutation({
    mutationFn: async (values: Parameters<typeof login>[0]) => login(values),
    onSuccess: (res) => {
      switchToStaffSession();
      messageApi.fromApi(res.data, "success");
      const userData = res?.data?.data?.user ?? null;
      if (userData) {
        setUser(userData);
      }
      setAuthenticated(true);
      const targetPath = getDefaultRouteForSnapshot(
        createAuthzSnapshot(userData || undefined),
      );
      window.location.replace(targetPath);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const onFinish = (values: Parameters<typeof login>[0]) => {
    loginMutation.mutate(values);
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

      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        id="login-form"
        className="flex flex-col"
      >
        <Form.Item
          name="username"
          rules={[
            {
              required: true,
              message: validation.required(validation.field("username")),
            },
            {
              min: 5,
              message: validation.minChars(validation.field("username"), 5),
            },
          ]}
          className="mb-4"
        >
          <Input
            suffix={<FaUser className="text-[#9CA3AF] ml-2" />}
            prefix={<FaUser className="text-[#6B7280] mr-2" />}
            placeholder={t("usernamePlaceholder")}
            disabled={loginMutation.isPending}
            className="w-full h-12 text-base! px-4! border border-[#E5E7EB] rounded-lg placeholder:text-[#9CA3AF] bg-[#F8FAFC]!"
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            {
              required: true,
              message: validation.required(validation.field("password")),
            },
            {
              min: 6,
              message: validation.minChars(validation.field("password"), 6),
            },
          ]}
          className="mb-5"
        >
          <Input.Password
            prefix={<FaLock className="text-[#6B7280] mr-2" />}
            placeholder={t("passwordPlaceholder")}
            disabled={loginMutation.isPending}
            iconRender={(visible) =>
              visible ? (
                <FaEye style={{ color: "#9CA3AF" }} className="ml-2" />
              ) : (
                <FaEyeSlash style={{ color: "#9CA3AF" }} className="ml-2" />
              )
            }
            className="w-full h-12 text-base! px-4! border border-[#E5E7EB] rounded-lg placeholder:text-[#9CA3AF] bg-[#F8FAFC]!"
          />
        </Form.Item>

        <div className="mb-8 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-center sm:justify-between">
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Checkbox className="text-[#595959] text-[14px]">
              {t("remember")}
            </Checkbox>
          </Form.Item>
          <Link
            href="/forgot-password"
            className="text-[14px] text-black! font-medium cursor-pointer"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <Button
          htmlType="submit"
          type="primary"
          loading={loginMutation.isPending}
          style={{
            boxShadow: "0px 4px 15px 0px #608DBC4D",
          }}
          className="w-full mb-6 text-lg! h-12! gap-3! rounded-lg bg-[#155DFC]! border-none! text-white! font-semibold! flex items-center justify-center"
        >
          {!loginMutation.isPending && <FaRightToBracket className="text-xl" />}{" "}
          {t("submit")}
        </Button>

        <div className="mb-6 text-center sm:mb-10">
          <span className="text-[#6B7280]">{t("needHelp")} </span>
          <Link href="#" className="text-[#155DFC] font-medium cursor-pointer">
            {t("contact")}
          </Link>
        </div>
      </Form>
    </div>
  );
}

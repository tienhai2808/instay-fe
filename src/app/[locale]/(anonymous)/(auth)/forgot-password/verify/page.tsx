"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resendForgotPasswordOtp, verifyOtp } from "@/apis/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { FaCheckCircle, FaClock, FaKey, FaRedoAlt } from "react-icons/fa";
import { Button } from "antd";
import { useMessage } from "@/providers/MessageProvider";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { OTP_EXPIRE_SECONDS, RESEND_COOLDOWN_SECONDS } from "@/constants/auth";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";

export default function VerifyPage() {
  const t = useTranslations("VerifyOtpPage");
  const router = useRouter();
  const { forgotPasswordToken, setResetPasswordToken } = useAuthStore();
  const messageApi = useMessage();
  const validation = useValidationMessages();
  const otpLengthMessage = validation.exactChars(validation.field("otp"), 6);

  const [otp, setOtp] = useState(Array.from({ length: 6 }, () => ""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const lastSubmittedOtp = useRef<string | null>(null);
  const autoSubmittedRef = useRef(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(OTP_EXPIRE_SECONDS);
  const [success, setSuccess] = useState(false);
  const [otpError, setOtpError] = useState("");

  const otpValue = otp.join("");

  const formattedRemaining = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }, [remainingSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async (otpCode: string) =>
      verifyOtp({
        forgot_password_token: forgotPasswordToken,
        otp: otpCode,
      }),
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
      const token = res.data.data.reset_password_token;
      setResetPasswordToken(token);
      setSuccess(true);

      setTimeout(() => {
        router.push("/new-password");
      }, 1200);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
      lastSubmittedOtp.current = null;
      autoSubmittedRef.current = false;
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () =>
      resendForgotPasswordOtp({
        forgot_password_token: forgotPasswordToken,
      }),
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setRemainingSeconds(OTP_EXPIRE_SECONDS);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  useEffect(() => {
    if (!forgotPasswordToken) {
      router.replace("/forgot-password");
    }
  }, [forgotPasswordToken, router]);

  useEffect(() => {
    if (otpValue.length !== 6) {
      autoSubmittedRef.current = false;
      return;
    }
    if (verifyMutation.isPending || resendMutation.isPending || success) return;
    if (lastSubmittedOtp.current === otpValue) return;
    if (autoSubmittedRef.current) return;

    autoSubmittedRef.current = true;
    lastSubmittedOtp.current = otpValue;
    verifyMutation.mutate(otpValue.trim());
  }, [otpValue, resendMutation.isPending, success, verifyMutation]);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      router.replace("/login");
    }
  }, [remainingSeconds, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleVerify = () => {
    if (otpValue.trim().length !== 6) {
      setOtpError(otpLengthMessage);
      lastSubmittedOtp.current = null;
      autoSubmittedRef.current = false;
      return;
    }

    setOtpError("");
    const nextOtp = otpValue.trim();
    lastSubmittedOtp.current = nextOtp;
    autoSubmittedRef.current = true;
    verifyMutation.mutate(nextOtp);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (otpError) {
      setOtpError("");
    }

    if (value && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    event.preventDefault();
    const next = [...otp];
    for (let i = 0; i < next.length; i += 1) {
      next[i] = pasted[i] || "";
    }
    setOtp(next);
    if (otpError) {
      setOtpError("");
    }
    const lastIndex = Math.min(pasted.length, next.length) - 1;
    if (lastIndex >= 0) {
      otpRefs.current[lastIndex]?.focus();
    }
  };

  const handleResend = () => {
    if (!forgotPasswordToken) {
      router.replace("/forgot-password");
      return;
    }

    resendMutation.mutate();
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
        <FaClock className="text-lg mt-0.5 text-[#155DFC]" />
        <p>
          {t("expiresIn")}{" "}
          <span className="font-semibold">{formattedRemaining}</span>.
        </p>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-3 text-[#6B7280] text-base">
          <FaKey className="text-base" />
          <span>{t("otpLabel")}</span>
        </div>
        <div className="mb-5 grid grid-cols-6 gap-2 sm:gap-3">
          {otp.map((digit, index) => (
            <input
              key={`otp-${index}`}
              ref={(el) => {
                otpRefs.current[index] = el;
              }}
              value={digit}
              onChange={(event) => handleOtpChange(index, event.target.value)}
              onKeyDown={(event) => handleOtpKeyDown(index, event)}
              onPaste={handleOtpPaste}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              disabled={verifyMutation.isPending || resendMutation.isPending}
              className="h-12 w-full rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] text-base text-center font-semibold text-[#111827] outline-none transition-all focus:border-[#155DFC] focus:ring-2 focus:ring-[#155DFC33] sm:h-14 sm:text-lg"
            />
          ))}
        </div>
        {otpError && <p className="mb-5 text-sm text-red-500">{otpError}</p>}

        <Button
          htmlType="button"
          type="primary"
          loading={verifyMutation.isPending}
          disabled={resendMutation.isPending}
          onClick={handleVerify}
          className="w-full mb-4 text-lg! h-12! gap-3! rounded-lg bg-[#155DFC]! border-none! text-white! font-semibold! flex items-center justify-center"
          style={{
            boxShadow: "0px 4px 15px 0px #608DBC4D",
          }}
        >
          {!verifyMutation.isPending && <FaCheckCircle className="text-xl" />}
          {t("verify")}
        </Button>

        <Button
          type="default"
          onClick={handleResend}
          disabled={resendMutation.isPending || resendCooldown > 0}
          className="w-full h-12! text-lg! rounded-lg border border-[#608DBC]! text-[#608DBC]! font-semibold! bg-white hover:bg-[#EFF6FF]! transition-colors flex items-center justify-center gap-3"
        >
          <FaRedoAlt className="text-xl" />
          {resendCooldown > 0
            ? t("resendWithCooldown", { seconds: resendCooldown })
            : t("resend")}
        </Button>
      </div>
    </div>
  );
}

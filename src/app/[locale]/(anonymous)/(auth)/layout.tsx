"use client";

import { ReactNode, useEffect } from "react";
import Image from "next/image";
import { LuCalendarCheck2 } from "react-icons/lu";
import { MdOutlineRealEstateAgent } from "react-icons/md";
import { FaRegHandshake } from "react-icons/fa";
import { IoStatsChartSharp } from "react-icons/io5";
import { useTranslations } from "next-intl";
import {
  clearClientAuthData,
  hasAnyClientAuthData,
} from "@/utils/auth-session";
import { useGuestStore } from "@/stores/useGuestStore";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  const t = useTranslations("AuthLayout");

  useEffect(() => {
    useGuestStore.getState().clearGuest();
    useGuestStore.persist.clearStorage();

    if (!hasAnyClientAuthData()) return;
    clearClientAuthData();
  }, []);

  const features = [
    {
      icon: <IoStatsChartSharp className="w-14 h-14 mb-3 text-white" />,
      title: t("features.dashboard"),
    },
    {
      icon: <LuCalendarCheck2 className="w-14 h-14 mb-3 text-white" />,
      title: t("features.booking"),
    },
    {
      icon: <MdOutlineRealEstateAgent className="w-14 h-14 mb-3 text-white" />,
      title: t("features.roomService"),
    },
    {
      icon: <FaRegHandshake className="w-14 h-14 mb-3 text-white" />,
      title: t("features.customer"),
    },
  ];

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/bg-auth.jpg"
          alt="Hotel Background"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="relative z-10 flex w-full mx-auto p-4 sm:p-6 lg:p-10">
        <div className="hidden w-6/11 flex-col justify-start text-white lg:flex">
          <div className="">
            <div className="mb-8">
              <Image
                src="/logo-light.svg"
                alt="Instay Logo"
                width={240}
                height={60}
              />
            </div>

            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-6 drop-shadow-md">
                {t("welcome")}
              </h1>
              <h2 className="text-[40px] font-bold leading-[1.2] drop-shadow-md">
                {t("headingLine1")}
                <br />
                {t("headingLine2")}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-8">
              {features.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center px-5 py-10 text-center rounded-xl bg-[#FFFFFF1A] backdrop-blur-[5px] border-t-[0.8px] border-[#FFFFFF33]"
                >
                  {item.icon}
                  <div className="font-semibold text-[22px]">{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full justify-center items-center lg:w-5/11">
          <div className="w-full max-w-150">{children}</div>
        </div>
      </div>
    </div>
  );
}

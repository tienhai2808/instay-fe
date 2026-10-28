import { BsCalendar4Event, BsChatText, BsQuestionCircle } from "react-icons/bs";
import { PiBed, PiUserList } from "react-icons/pi";
import { MdOutlineCleaningServices } from "react-icons/md";
import { BiCommentAdd } from "react-icons/bi";
import { AiOutlineLineChart } from "react-icons/ai";
import { FaRegUser } from "react-icons/fa";
import { TiGroupOutline } from "react-icons/ti";
import { CiPassport1 } from "react-icons/ci";
import { HiOutlineNewspaper } from "react-icons/hi2";
import { IoBusinessOutline } from "react-icons/io5";

export const MENU_ITEMS = [
  {
    id: "overview",
    icon: AiOutlineLineChart,
    href: "/dashboard",
  },
  {
    id: "booking-management",
    icon: BsCalendar4Event,
    hasSubMenu: true,
    subItems: [
      { id: "bookings", href: "/bookings" },
      {
        id: "price-calculator",
        href: "/price-calculator",
      },
    ],
  },
  {
    id: "room-management",
    icon: PiBed,

    hasSubMenu: true,
    subItems: [
      { id: "room-types", href: "/room-types" },
      {
        id: "rooms",
        href: "/rooms",
      },
      {
        id: "calendar",
        href: "/calendar",
      },
    ],
  },
  {
    id: "service-management",
    icon: MdOutlineCleaningServices,
    hasSubMenu: true,
    subItems: [
      { id: "service-types", href: "/service-types" },
      {
        id: "services",
        href: "/services",
      },
      {
        id: "order-services",
        href: "/order-services",
      },
    ],
  },
  {
    id: "events",
    icon: HiOutlineNewspaper,
    href: "/events",
  },
  {
    id: "request-management",
    icon: BsQuestionCircle,
    hasSubMenu: true,
    subItems: [
      {
        id: "support-categories",
        href: "/support-categories",
      },
      {
        id: "support-tickets",
        href: "/support-tickets",
      },
    ],
  },
  {
    id: "customers",
    icon: FaRegUser,
    href: "/customers",
  },
  {
    id: "departments",
    icon: TiGroupOutline,
    href: "/departments",
  },
  {
    id: "branches",
    icon: IoBusinessOutline,
    href: "/branches",
  },
  {
    id: "staffs",
    icon: PiUserList,
    href: "/staffs",
  },
  {
    id: "reviews",
    icon: BiCommentAdd,
    href: "/reviews",
  },
  {
    id: "chats",
    icon: BsChatText,
    href: "/chats",
  },
  {
    id: "accommodation",
    icon: CiPassport1,
    href: "/accommodation",
  },
];

import {
  LayoutDashboard,
  Repeat,
  Backpack,
  Calculator,
  Sparkles,
  Users,
  History,
  MonitorSmartphone,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string; // Thai label
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/farm-loops", label: "ชุดฟาร์มลูป", icon: Repeat },
  { href: "/inventory", label: "กระเป๋า", icon: Backpack },
  { href: "/calculator", label: "เครื่องคิดราคา", icon: Calculator },
  { href: "/loot", label: "ของที่ได้", icon: Sparkles },
  { href: "/history", label: "ประวัติการเล่น", icon: History },
  { href: "/characters", label: "ตัวละคร", icon: Users },
  { href: "/agents", label: "เครื่องเอเจนต์", icon: MonitorSmartphone },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

import type { ReactNode } from "react";
import { LayoutGridIcon, BookOpenIcon, BuildingIcon, RouteIcon, UsersIcon, WalletIcon, ShieldCheckIcon, GraduationCapIcon } from "lucide-react";

export type SidebarNavItem = {
	title: string;
	path: string;
	icon?: ReactNode;
};

export const navItems: SidebarNavItem[] = [
	{ title: "Tableau de bord", path: "/", icon: <LayoutGridIcon /> },
	{ title: "Catalogue", path: "/catalogue/formations", icon: <BookOpenIcon /> },
	{ title: "Clients", path: "/clients", icon: <BuildingIcon /> },
	{ title: "Parcours", path: "/parcours", icon: <RouteIcon /> },
	{ title: "Participants", path: "/participants", icon: <UsersIcon /> },
	{ title: "Financeurs", path: "/financeurs", icon: <WalletIcon /> },
	{ title: "Amélioration continue", path: "/amelioration", icon: <ShieldCheckIcon /> },
	{ title: "Formateurs", path: "/formateurs", icon: <GraduationCapIcon /> },
];

export function isNavItemActive(pathname: string, item: SidebarNavItem): boolean {
	if (item.path === "/") return pathname === "/";
	return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

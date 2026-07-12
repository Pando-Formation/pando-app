"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { navItems, isNavItemActive } from "@/components/app-shared";

export function AppSidebar() {
	const pathname = usePathname();

	return (
		<Sidebar
			className={cn(
				"*:data-[slot=sidebar-inner]:bg-background",
				"**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75"
			)}
			collapsible="icon"
			variant="sidebar"
		>
			<SidebarHeader className="h-14 justify-center border-b px-4">
				<span className="t-overline">PANDO</span>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{navItems.map((item) => (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									isActive={isNavItemActive(pathname, item)}
									render={<Link href={item.path} />}
								>
									{item.icon}
									<span>{item.title}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

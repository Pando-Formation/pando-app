"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOutIcon } from "lucide-react";
import { signOutAction } from "@/lib/actions/sign-out";

function initials(name: string | null, email: string) {
	if (name) {
		const parts = name.trim().split(/\s+/);
		return (parts[0]?.[0] ?? "").concat(parts.length > 1 ? parts.at(-1)?.[0] ?? "" : "").toUpperCase();
	}
	return email.charAt(0).toUpperCase();
}

export function NavUser({ user }: { user: { name: string | null; email: string } }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger nativeButton={false} render={<Avatar className="size-8" />}>
				<AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuItem className="flex items-center justify-start gap-2">
					<DropdownMenuLabel className="flex items-center gap-3">
						<Avatar className="size-10">
							<AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
						</Avatar>
						<div>
							<span className="font-medium text-foreground">{user.name ?? user.email}</span>
							<br />
							<div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap text-muted-foreground text-xs">
								{user.email}
							</div>
						</div>
					</DropdownMenuLabel>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="w-full cursor-pointer"
					onClick={() => signOutAction()}
					variant="destructive"
				>
					<LogOutIcon />
					Se déconnecter
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

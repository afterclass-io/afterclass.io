"use client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/common/components/avatar";
import { ExitIcon } from "@radix-ui/react-icons";
import { signOut } from "next-auth/react";
import type { SessionUser } from "@/server/auth/config";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/popover";
import { Button } from "@/common/components/button";

interface Props {
  user: SessionUser;
}

export const UserProfile = ({ user }: Props) => {
  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Popover>
      <PopoverTrigger className="hidden items-center gap-2 md:flex">
        <div className="text-muted-foreground overflow-hidden text-sm text-ellipsis">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.photoUrl ?? undefined} alt={user.email} />
            <AvatarFallback className="text-center">
              {user.email[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
        </div>
        <div>{user.email}</div>
      </PopoverTrigger>
      <PopoverContent sideOffset={24} className="w-fit shadow-lg">
        <Button
          className="flex w-full flex-row items-center justify-between gap-4"
          variant="ghost"
          onClick={() => handleLogout()}
        >
          <p>Logout</p>
          <ExitIcon />
        </Button>
      </PopoverContent>
    </Popover>
  );
};

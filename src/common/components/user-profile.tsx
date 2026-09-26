"use client";
import { ExitIcon } from "@radix-ui/react-icons";
import { signOut } from "next-auth/react";
import type { SessionUser } from "@/server/auth/config";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/popover";
import { Button } from "@/common/components/button";
import { UserAvatar } from "@/common/components/user-avatar";

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
          {/* Decorative: the email is rendered as adjacent text below. */}
          <UserAvatar
            photoUrl={user.photoUrl}
            fallback={user.email[0]?.toUpperCase() ?? "U"}
          />
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

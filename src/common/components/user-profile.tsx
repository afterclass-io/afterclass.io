"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/common/components/avatar";
import { useState } from "react";
import { ExitIcon } from "@radix-ui/react-icons";
import { signOut } from "next-auth/react";
import type { SessionUser } from "@/server/auth/config";

interface Props {
  user: SessionUser;
}

export const UserProfile = ({ user }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      <button
        onClick={() => toggleModal()}
        className="hidden items-center gap-2 md:flex"
      >
        <div className="text-muted-foreground overflow-hidden text-sm text-ellipsis">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.photoUrl ?? undefined} alt={user.email} />
            <AvatarFallback className="text-center">
              {user.email[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
        </div>
        <div>{user.email}</div>
      </button>

      {isModalOpen && (
        <div className="border-border-elevated bg-bg-base absolute top-16 w-[200px] rounded-lg border p-4">
          <button
            className="flex w-full flex-row items-center justify-between"
            onClick={() => handleLogout()}
          >
            <p>Logout</p>
            <ExitIcon />
          </button>
        </div>
      )}
    </>
  );
};

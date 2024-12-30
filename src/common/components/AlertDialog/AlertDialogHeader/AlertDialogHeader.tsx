import * as React from "react";
import { alertDialogTheme } from "../AlertDialog.theme";

export const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={alertDialogTheme().header({ className })} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

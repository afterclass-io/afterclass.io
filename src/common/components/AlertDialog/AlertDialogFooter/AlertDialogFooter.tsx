import * as React from "react";
import { alertDialogTheme } from "../AlertDialog.theme";

export const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={alertDialogTheme().footer({ className })} {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

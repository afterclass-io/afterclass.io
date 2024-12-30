"use client";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { AlertDialogPortal } from "./AlertDialogPortal";
import { AlertDialogOverlay } from "./AlertDialogOverlay";
import { AlertDialogContent } from "./AlertDialogContent";
import { AlertDialogHeader } from "./AlertDialogHeader";
import { AlertDialogFooter } from "./AlertDialogFooter";
import { AlertDialogTitle } from "./AlertDialogTitle";
import { AlertDialogDescription } from "./AlertDialogDescription";
import { AlertDialogAction } from "./AlertDialogAction";
import { AlertDialogCancel } from "./AlertDialogCancel";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};

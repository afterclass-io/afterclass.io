/**
 * ref:
 * - https://ui.shadcn.com/docs/components/command
 * - https://github.com/pacocoursey/cmdk
 * - https://github.com/shadcn-ui/ui/issues/173
 */
"use client";

import {
  forwardRef,
  type ElementRef,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ComponentPropsWithRef,
} from "react";
import { Command as CommandPrimitive } from "cmdk";
import PhMagnifyingGlass from "~icons/ph/magnifying-glass";

import { Modal, type ModalProps } from "@/common/components/Modal";
import { commandTheme, type CommandVariants } from "./Command.theme";

const CommandInput = forwardRef<
  ElementRef<typeof CommandPrimitive.Input>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => {
  const { commandInputWrapper, commandInputIcon, commandInput } =
    commandTheme();
  return (
    <div className={commandInputWrapper()} cmdk-input-wrapper="">
      <PhMagnifyingGlass className={commandInputIcon()} />
      <CommandPrimitive.Input
        ref={ref}
        className={commandInput({ className })}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = forwardRef<
  ElementRef<typeof CommandPrimitive.List>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={commandTheme().commandList({ className })}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = forwardRef<
  ElementRef<typeof CommandPrimitive.Empty>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={commandTheme().commandEmpty()}
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = forwardRef<
  ElementRef<typeof CommandPrimitive.Group>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={commandTheme().commandGroup({ className })}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = forwardRef<
  ElementRef<typeof CommandPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={commandTheme().commandSeparator({ className })}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = forwardRef<
  ElementRef<typeof CommandPrimitive.Item>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={commandTheme().commandItem({ className })}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={commandTheme().commandShortcut({ className })}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

interface CommandRootBaseProps
  extends ComponentPropsWithRef<typeof CommandPrimitive> {
  as?: "command";
}
type CommandRootProps = CommandRootBaseProps & CommandVariants;
const CommandRoot = forwardRef<
  ElementRef<typeof CommandPrimitive>,
  CommandRootProps
>(({ className, variant, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={commandTheme().command({ className, variant })}
    {...props}
  />
));
CommandRoot.displayName = CommandPrimitive.displayName;

interface CommandDialogProps extends ModalProps {
  as?: "dialog";
}
const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  const { commandDialog, commandDialogContent } = commandTheme();
  return (
    <Modal variant="command" {...props}>
      <Modal.Content className={commandDialogContent()}>
        <CommandRoot className={commandDialog()}>{children}</CommandRoot>
      </Modal.Content>
    </Modal>
  );
};

export const Command = (props: CommandRootProps | CommandDialogProps) => {
  // Accessing .as instead of destructuring to make use of discriminated unions
  // https://github.com/microsoft/TypeScript/issues/46318
  if (props.as === "dialog") {
    // Has an unused `as` to remove
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { as, ..._props } = props;
    return <CommandDialog {..._props} />;
  } else {
    // Has an unused `as` to remove
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { as, ..._props } = props as CommandRootProps;
    return <CommandRoot {..._props} />;
  }
};

Command.Dialog = CommandDialog;
Command.Input = CommandInput;
Command.List = CommandList;
Command.Empty = CommandEmpty;
Command.Group = CommandGroup;
Command.Item = CommandItem;
Command.Shortcut = CommandShortcut;
Command.Separator = CommandSeparator;

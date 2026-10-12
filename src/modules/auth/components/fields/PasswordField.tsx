import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import { LockIcon } from "@/common/components/icons";
import {
  PasswordInputRoot,
  PasswordInputAdornment,
  PasswordInputAdornmentToggle,
  PasswordInput,
} from "@/common/components/input-password";

type PasswordFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: ReactNode;
  labelClassName?: string;
  placeholder: string;
  tabIndex: number;
  dataTest?: string;
  disabled: boolean;
};

export const PasswordField = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  labelClassName,
  placeholder,
  tabIndex,
  dataTest,
  disabled,
}: PasswordFieldProps<TFieldValues>) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel className={labelClassName}>{label}</FormLabel>
        <FormControl>
          <PasswordInputRoot>
            <PasswordInputAdornment>
              <LockIcon />
            </PasswordInputAdornment>
            <PasswordInput
              {...field}
              disabled={disabled}
              placeholder={placeholder}
              autoComplete="on"
              tabIndex={tabIndex}
              data-test={dataTest}
            />
            <PasswordInputAdornmentToggle />
          </PasswordInputRoot>
        </FormControl>
        <FormMessage
          data-test={dataTest ? `${dataTest}-helper-text` : undefined}
        />
      </FormItem>
    )}
  />
);

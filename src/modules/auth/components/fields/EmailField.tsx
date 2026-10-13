import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/form";
import { EnvelopeIcon } from "@/common/components/icons";
import {
  Input,
  InputAdornment,
  InputControl,
  InputRoot,
} from "@/common/components/input";

type EmailFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: ReactNode;
  placeholder: string;
  tabIndex: number;
  dataTest: string;
  disabled: boolean;
};

export const EmailField = <TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  tabIndex,
  dataTest,
  disabled,
}: EmailFieldProps<TFieldValues>) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <InputRoot>
            <InputAdornment>
              <EnvelopeIcon />
            </InputAdornment>
            <InputControl>
              <Input
                {...field}
                disabled={disabled}
                placeholder={placeholder}
                autoComplete="on"
                tabIndex={tabIndex}
                data-test={dataTest}
              />
            </InputControl>
          </InputRoot>
        </FormControl>
        <FormMessage data-test={`${dataTest}-helper-text`} />
      </FormItem>
    )}
  />
);

import { AfterclassIcon, AfterclassText } from "./icons";

export interface LogoProps {
  hideText?: boolean;
  hideLogo?: boolean;
}

export const Logo = ({ hideText = false, hideLogo = false }: LogoProps) => {
  return (
    <div className="flex h-6 items-center justify-center gap-x-2">
      {!hideLogo && <AfterclassIcon className="h-full" />}
      {!hideText && (
        <AfterclassText className="h-full w-full self-stretch pb-1" />
      )}
    </div>
  );
};

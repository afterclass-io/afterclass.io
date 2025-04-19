import { AfterclassIcon, AfterclassText } from "./icons";

export interface LogoProps {
  hideText?: boolean;
  hideLogo?: boolean;
}

export const Logo = ({ hideText = false, hideLogo = false }: LogoProps) => {
  return (
    <div className="flex h-6 items-center justify-center gap-x-2">
      {!hideLogo && <AfterclassIcon size={16} />}
      {!hideText && <AfterclassText />}
    </div>
  );
};

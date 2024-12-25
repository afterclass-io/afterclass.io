import {
  type ReactNode,
  type ReactElement,
  isValidElement,
  cloneElement,
} from "react";

import { type ButtonLinkOrAnchorProps } from "@/common/components/Button";

import { type CtaCardVariants, ctaCardTheme } from "./CtaCard.theme";
import { ProgressLink } from "@/common/components/Progress";

export type CtaCardProps = CtaCardVariants &
  ButtonLinkOrAnchorProps & {
    ctaText: string;
  };

export const CtaCard = ({
  ctaText,
  iconLeft,
  iconRight,
  ...props
}: CtaCardProps) => {
  const { button, ctaWrapper, cta, icon } = ctaCardTheme();
  const renderIcon = (iconElement: ReactNode) => {
    if (!isValidElement(iconElement)) {
      return null;
    }
    return cloneElement(iconElement as ReactElement, { className: icon() });
  };

  return (
    <ProgressLink className={button()} asChild {...props}>
      <div className={ctaWrapper()}>
        {renderIcon(iconLeft)}
        <span className={cta()}>{ctaText}</span>
      </div>
      {renderIcon(iconRight)}
    </ProgressLink>
  );
};

"use client";
import { CustomIcon, type CustomIconProps } from "../custom-icon";
import { NTUIcon } from "./icon-ntu";
import { NUSIcon } from "./icon-nus";
import { SMUIcon } from "./icon-smu";
import { type UniversityAbbreviation } from "@prisma/client";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/common/components/tooltip";

export interface SchoolIconProps extends CustomIconProps {
  school: UniversityAbbreviation;
}
const svgs = {
  SMU: SMUIcon,
  NUS: NUSIcon,
  NTU: NTUIcon,
};

export const SchoolIcon = ({ school, ...props }: SchoolIconProps) => {
  const schoolSVG = svgs[school] || SMUIcon;

  return (
    <Tooltip>
      <TooltipTrigger>
        <CustomIcon viewBox="0 0 63 63" fill="none" {...props}>
          {schoolSVG}
        </CustomIcon>
      </TooltipTrigger>
      <TooltipContent>
        <span>{school}</span>
      </TooltipContent>
    </Tooltip>
  );
};

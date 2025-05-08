import { AfterclassIcon, CustomIcon } from "@/common/components/icons";
import { NTUIcon, NUSIcon, SMUIcon } from "@/common/components/icons";
import { type UniversityAbbreviation } from "@prisma/client";

const svgs = {
  SMU: SMUIcon,
  NUS: NUSIcon,
  NTU: NTUIcon,
} satisfies Record<UniversityAbbreviation, React.ReactNode>;

const SchoolIcon = ({ school }: { school: UniversityAbbreviation }) => {
  const schoolSVG = svgs[school] || SMUIcon;
  return (
    <div
      style={{
        display: "flex",
        gap: "0.375rem",
        borderRadius: "9999px",
        paddingLeft: "0.375rem",
        paddingRight: "0.75rem",
        paddingTop: "0.25rem",
        paddingBottom: "0.25rem",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid rgba(15, 15, 15, 0.15)",
      }}
    >
      <CustomIcon viewBox="0 0 63 63" fill="none" width="3rem" height="3rem">
        {schoolSVG}
      </CustomIcon>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: "1.25rem",
          fontStyle: "normal",
          fontWeight: "600",
          lineHeight: "1.53125rem",
          letterSpacing: "-0.02125rem",
          color: "#070708",
        }}
      >
        {school}
      </div>
    </div>
  );
};

export const OgImageHeader = ({
  school,
  code,
}: {
  school: UniversityAbbreviation;
  code?: string;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      alignSelf: "stretch",
    }}
  >
    <div
      style={{
        display: "flex",
        gap: "1rem",
        alignItems: "center",
      }}
    >
      <SchoolIcon school={school} />
      {code && (
        <div
          style={{
            display: "flex",
            fontSize: "24px",
            color: "#7A7A85",
            fontWeight: "800",
          }}
        >
          {code}
        </div>
      )}
    </div>
    <AfterclassIcon height="51.75" width="50" style={{ color: "#5039D4" }} />
  </div>
);

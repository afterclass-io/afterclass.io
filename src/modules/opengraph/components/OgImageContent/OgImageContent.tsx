import PhPencilFill from "~icons/ph/pencil-fill";
import PhBookBookmarkFill from "~icons/ph/book-bookmark-fill";
import PhGraduationCapFill from "~icons/ph/graduation-cap-fill";
import TwemojiBrownHeart from "~icons/twemoji/brown-heart";

const StatItemHorizontal = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      paddingLeft: "0.25rem",
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div
      style={{
        fontSize: "2.25rem",
        fontStyle: "normal",
        fontWeight: "600",
        lineHeight: "2.71875rem",
        letterSpacing: "-0.0495rem",
        color: "#070708",
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: "1.25rem",
        fontStyle: "normal",
        fontWeight: "500",
        lineHeight: "1.53125rem",
        letterSpacing: "-0.02125rem",
        color: "#56565D",
      }}
    >
      {label}
    </div>
  </div>
);

const FilterItemStats = ({
  icon,
  stat,
}: {
  icon: React.ReactNode;
  stat: string | number;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      fontFamily: "Inter, sans-serif",
      color: "#7A7A85",
    }}
  >
    {icon}
    <div
      style={{
        display: "flex",
        fontSize: "1.25rem",
        fontStyle: "normal",
        fontWeight: "500",
        lineHeight: "1.53125rem",
        letterSpacing: "-0.02125rem",
      }}
    >
      {typeof stat === "string" ? stat : stat.toLocaleString()}
    </div>
  </div>
);

const StatItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: "0.5rem",
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div
      style={{
        fontSize: "1.125rem",
        fontStyle: "normal",
        fontWeight: "500",
        lineHeight: "1.375rem",
        letterSpacing: "-0.01575rem",
        color: "#7A7A85",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: "1.875rem",
        fontStyle: "normal",
        fontWeight: "600",
        lineHeight: "2.25rem",
        letterSpacing: "-0.03938rem",
        color: "#070708",
      }}
    >
      {value}
    </div>
  </div>
);

export const OgImageContent = ({
  rating,
  reviewCount,
  courseCount,
  profCount,
  statItems,
}: {
  rating: string;
  reviewCount: string | number;
  courseCount?: string | number;
  profCount?: string | number;
  statItems: {
    label: string;
    value: string | number;
  }[];
}) => (
  <div
    style={{
      display: "flex",
      width: "100%",
      padding: "1.5rem",
      gap: "1.5rem",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      alignSelf: "stretch",
      borderRadius: "1.25rem",
      background: "#F7F7F8",
    }}
  >
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
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <TwemojiBrownHeart width="2rem" height="2rem" />
        <StatItemHorizontal label="Average Rating" value={rating} />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <FilterItemStats
          icon={<PhPencilFill width="2rem" height="2rem" />}
          stat={reviewCount}
        />
        {profCount != null && (
          <FilterItemStats
            icon={<PhGraduationCapFill width="2rem" height="2rem" />}
            stat={profCount}
          />
        )}
        {courseCount != null && (
          <FilterItemStats
            icon={<PhBookBookmarkFill width="2rem" height="2rem" />}
            stat={courseCount}
          />
        )}
      </div>
    </div>

    <div
      style={{
        display: "flex",
        gap: "3.5rem",
        alignItems: "flex-start",
      }}
    >
      {statItems.map(({ label, value }, idx) => (
        <StatItem key={idx} label={label} value={value} />
      ))}
    </div>
  </div>
);

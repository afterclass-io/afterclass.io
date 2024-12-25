import { modalTheme } from "../Modal.theme";

export const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { header } = modalTheme({
    size: { initial: "sm", md: "md" },
  });

  return (
    <div
      className={header({
        className,
      })}
      {...props}
    />
  );
};

import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const SearchIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon viewBox="0 0 24 24" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.25 11.25C5.25 7.93629 7.93629 5.25 11.25 5.25C14.5637 5.25 17.25 7.93629 17.25 11.25C17.25 14.5637 14.5637 17.25 11.25 17.25C7.93629 17.25 5.25 14.5637 5.25 11.25ZM11.25 3C6.69365 3 3 6.69365 3 11.25C3 15.8063 6.69365 19.5 11.25 19.5C13.1225 19.5 14.8494 18.8762 16.234 17.825L20.5795 22.1705C21.0188 22.6098 21.7312 22.6098 22.1705 22.1705C22.6098 21.7312 22.6098 21.0188 22.1705 20.5795L17.825 16.234C18.8762 14.8494 19.5 13.1225 19.5 11.25C19.5 6.69365 15.8063 3 11.25 3Z"
        fill="currentColor"
      />
    </CustomIcon>
  );
};

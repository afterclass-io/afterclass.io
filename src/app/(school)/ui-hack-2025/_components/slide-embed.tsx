import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";

export const SlideEmbed = ({ src }: { src: string }) => {
  return (
    <div className="bg-muted relative aspect-[16/9] shrink-0 overflow-hidden rounded-lg border">
      <FullWidthEnforcer />
      <iframe
        loading="lazy"
        className="absolute top-0 left-0 size-full"
        src={src}
        allow="fullscreen"
        allowFullScreen
      ></iframe>
    </div>
  );
};

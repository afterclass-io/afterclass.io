export const SlideEmbed = ({ src }: { src: string }) => {
  return (
    <div className="bg-muted relative aspect-[16/9] overflow-hidden rounded-lg border">
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

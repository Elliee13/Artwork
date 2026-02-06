import { cn } from "@/lib/utils";

type ImageItemProps = {
  src: string;
  alt: string;
  className?: string;
};

export default function ImageItem({ src, alt, className }: ImageItemProps) {
  return (
    <article className={cn("group overflow-hidden rounded-xl bg-white shadow-sm image-item", className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="block h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
      />
    </article>
  );
}

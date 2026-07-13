import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-center"
      duration={2500}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-success group-[.toaster]:text-success-foreground group-[.toaster]:border-0 group-[.toaster]:shadow-none group-[.toaster]:rounded-none group-[.toaster]:w-full group-[.toaster]:justify-center group-[.toaster]:py-4 group-[.toaster]:px-6 group-[.toaster]:text-base group-[.toaster]:font-medium",
          description: "group-[.toast]:text-success-foreground/80",
          actionButton: "group-[.toast]:bg-success-foreground group-[.toast]:text-success",
          cancelButton: "group-[.toast]:bg-success-foreground/20 group-[.toast]:text-success-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

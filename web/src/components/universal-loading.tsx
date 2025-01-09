import { motion } from "motion/react";
import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";

export function UniversalLoading(props: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: "-250px" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "-250px" }}
      className={cn(
        "flex h-[85vh] flex-col items-center justify-center",
        props.className,
      )}
    >
      <Loader size={78} strokeWidth={1.5} className="animate-spin" />

      <div className="flex flex-col items-center">
        <h3 className="text-center w-[85%] mt-8 scroll-m-20 md:text-3xl md:w-full font-semibold tracking-tight">
          {props.title}
        </h3>
        <p className="text-center  md:text-xl md:mt-1.5 font-light leading-7">
          {props.description}
        </p>
      </div>
    </motion.div>
  );
}

import { motion } from "framer-motion";

export default function LoadingBubble() {
  return (
    <div className="flex space-x-2 p-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary/50 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

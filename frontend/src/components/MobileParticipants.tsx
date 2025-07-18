"use client";
import { motion, useMotionValue, animate } from "framer-motion";

// framer motion for animation of the bottom sheet

const MIN_Y = 400; // collapsed
const MAX_Y = 0; // sheet open

export default function MobileParticipants({
  children,
}: {
  children: React.ReactNode;
}) {
  const y = useMotionValue(200); // default is open halfway

  const handleDragEnd = () => {
    const currentY = y.get();
    const halfway = 200;

    // if dragged more than halfway down, then fully collapse, else stay open
    const finalY = currentY > halfway ? MIN_Y : MAX_Y;
    // animate the drawer
    animate(y, finalY, { type: "spring", stiffness: 300, damping: 30 });
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg md:hidden"
      style={{ y }}
      drag="y"
      dragConstraints={{ top: MAX_Y, bottom: MIN_Y }}
      onDragEnd={handleDragEnd}
      dragElastic={0.2}
    >
      <div className="w-full h-6 flex justify-center items-center cursor-grab">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
      </div>
      <div className="px-4 pb-6">{children}</div>
    </motion.div>
  );
}

"use client";
import { motion, useMotionValue, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// framer motion for animation of the bottom sheet

export default function MobileParticipants({
  children,
}: {
  children: React.ReactNode;
}) {
  const grabHandleHeight = 40;
  const containerRef = useRef<HTMLDivElement>(null); // the child
  const [expandedHeight, setExpandedHeight] = useState(0);
  const [minY, setMinY] = useState(0); // closed state, but still visible grab handle

  const y = useMotionValue(0); // start open

  // get the children's height
  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.offsetHeight;
      setExpandedHeight(height);
      setMinY(height - grabHandleHeight);
    }
  }, [children, y]);

  const handleDragEnd = () => {
    const currentY = y.get();
    const halfway = 200;

    // if dragged more than halfway down, then fully collapse, else stay open
    const finalY = currentY > halfway ? minY : 0;
    // animate the drawer
    animate(y, finalY, { type: "spring", stiffness: 300, damping: 30 });
  };

  return (
    <motion.div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg md:hidden"
      style={{ y }}
      drag="y"
      dragConstraints={{ top: 0, bottom: minY }}
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

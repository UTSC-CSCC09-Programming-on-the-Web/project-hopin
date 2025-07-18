import { useState } from "react";
import { motion } from "framer-motion";

export const DragDrawer = ({ open, setOpen, children }) => {
  return (
    <div className="grid h-screen place-content-center">
      <button onClick={() => setOpen(true)} className="rounded ">
        Open Drawer
      </button>
      <DragCloseDrawer open={open} setOpen={setOpen}>
        <div>hello im inside</div>
      </DragCloseDrawer>
    </div>
  );
};

const DragCloseDrawer = ({ open, setOpen, children }) => {
  return (
    <>
      {open && (
        <motion.div className="fixed inset-0 z-50 bg-white"></motion.div>
      )}
    </>
  );
};

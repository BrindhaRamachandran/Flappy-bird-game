import React from "react";

const Pipe = ({ left, top, height, type }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: left,
        top: top,
        width: 500,
        height: height,
        overflow: "hidden",
      }}
    >
      <img
        src={type === "top" ? process.env.PUBLIC_URL + "/pipe-top.png" : process.env.PUBLIC_URL + "/pipe-bottom.png"}
        alt="pipe"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",

          // 🔥 IMPORTANT CHANGE
          objectFit: "cover",

          // ✅ FIX TOP PIPE ONLY
          top: 0,
    bottom: "auto",

          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default Pipe;

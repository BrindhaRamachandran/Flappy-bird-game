import React, { useEffect, useState } from "react";

const Bird = ({ top, velocity }) => {
  const [frame, setFrame] = useState(0);
  const frames = [
  process.env.PUBLIC_URL + "/bird1.png",
  process.env.PUBLIC_URL + "/bird2.png",
  process.env.PUBLIC_URL + "/bird3.png"
];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 3);
    }, 120);

    return () => clearInterval(interval);
  }, []);

  return (
    <img
      src={frames[frame]}
      alt="bird"
      style={{
        position: "absolute",
        left: "20%",
        top: top,
        width: 70,
        height: 70,
        transform: `rotate(${Math.min(velocity * 3, 45)}deg)`
      }}
    />
  );
};

export default Bird;

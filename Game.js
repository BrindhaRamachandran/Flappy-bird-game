import React, { useEffect, useRef, useState, useCallback } from "react";
import Bird from "./Bird";
import Pipe from "./Pipe";
import Confetti from "react-confetti";

const GRAVITY = 0.6;
const JUMP_FORCE = -9;
const MAX_FALL_SPEED = 9;
const GAP = 200;
const BIRD_WIDTH = 70;
const BIRD_HEIGHT = 70;
const GROUND_HEIGHT = 100;
const PIPE_WIDTH = 150;

const Game = () => {
  const [birdTop, setBirdTop] = useState(200);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState("start");
  const [speed, setSpeed] = useState(3);
  const [showConfetti, setShowConfetti] = useState(false);
  const [popHighScore, setPopHighScore] = useState(false);

  const birdRef = useRef({ top: 200, velocity: 0 });
  const pipesRef = useRef([]);
  const isDead = useRef(false);

  const jumpSound = useRef(null);
  const hitSound = useRef(null);
  const scoreSound = useRef(null);
  const startSound = useRef(null);

  const initAudio = () => {
    jumpSound.current = new Audio(process.env.PUBLIC_URL + "/flap.mp3");
    hitSound.current = new Audio(process.env.PUBLIC_URL + "/flappy-bird-hit-sound.mp3");
    scoreSound.current = new Audio(process.env.PUBLIC_URL + "/point.mp3");
    startSound.current = new Audio(process.env.PUBLIC_URL + "/swoosh.mp3");
  };

  const playSound = (soundRef) => {
    if (soundRef.current) {
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(() => {});
    }
  };

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem("highScore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const handleGameOver = useCallback(() => {
    playSound(hitSound);
    isDead.current = true;
    setPopHighScore(false);
    setShowConfetti(false);

    // Bird falls to ground first, then Game Over appears
    const fallInterval = setInterval(() => {
      birdRef.current.velocity += GRAVITY * 2;
      if (birdRef.current.velocity > MAX_FALL_SPEED) birdRef.current.velocity = MAX_FALL_SPEED;
      birdRef.current.top += birdRef.current.velocity;
      setBirdTop(birdRef.current.top);

      if (birdRef.current.top >= window.innerHeight - GROUND_HEIGHT - BIRD_HEIGHT) {
        clearInterval(fallInterval);
        setGameState("gameover");
      }
    }, 16);
  }, []);

  const handleAction = useCallback(() => {
    if (!jumpSound.current) initAudio();
    if (gameState === "start") {
      playSound(startSound);
      setGameState("playing");
    } else if (gameState === "playing" && !isDead.current) {
      birdRef.current.velocity = JUMP_FORCE;
      playSound(jumpSound);
    } else if (gameState === "gameover") restart();
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction]);

  const handleClick = () => handleAction();

  const restart = () => {
    birdRef.current = { top: 200, velocity: 0 };
    pipesRef.current = [];
    isDead.current = false;
    setBirdTop(200);
    setPipes([]);
    setScore(0);
    setSpeed(3);
    setGameState("start");
    setShowConfetti(false);
    setPopHighScore(false);
  };

  // Game loop
  useEffect(() => {
    let raf, spawnInterval;

    const update = () => {
      // Continuous pipe movement
      pipesRef.current = pipesRef.current
        .map((pipe) => ({ ...pipe, x: pipe.x - speed }))
        .filter((pipe) => pipe.x > -PIPE_WIDTH);
      setPipes([...pipesRef.current]);

      if (gameState === "playing") {
        birdRef.current.velocity += GRAVITY;
        if (birdRef.current.velocity > MAX_FALL_SPEED) birdRef.current.velocity = MAX_FALL_SPEED;
        birdRef.current.top += birdRef.current.velocity;
        setBirdTop(birdRef.current.top);

        if (!isDead.current) {
          // Scoring
          pipesRef.current.forEach((pipe) => {
            if (!pipe.passed && pipe.x + PIPE_WIDTH < window.innerWidth * 0.2) {
              pipe.passed = true;
              playSound(scoreSound);
              setScore((s) => {
                const newScore = s + 1;

                // Speed increases every 10 points
                if (newScore % 10 === 0) setSpeed((prev) => prev + 0.2);

                // Confetti only for new high score
                if (newScore > highScore && !showConfetti) {
                  setShowConfetti(true);
                  setPopHighScore(true);
                  setTimeout(() => {
                    setShowConfetti(false);
                    setPopHighScore(false);
                  }, 2000);
                }
                return newScore;
              });
            }
          });

          // ✅ FIXED Collision detection — birdScreenLeft matches Bird.js "left: 20%"
          const HITBOX_SCALE = 0.5;
          const birdScreenLeft = window.innerWidth * 0.2;
          const birdLeft = birdScreenLeft + (BIRD_WIDTH * (1 - HITBOX_SCALE)) / 2;
          const birdRight = birdLeft + BIRD_WIDTH * HITBOX_SCALE;
          const birdTopPos = birdRef.current.top + (BIRD_HEIGHT * (1 - HITBOX_SCALE)) / 2;
          const birdBottom = birdTopPos + BIRD_HEIGHT * HITBOX_SCALE;

          for (let pipe of pipesRef.current) {
            if (pipe.x + PIPE_WIDTH < birdLeft) continue;
            const pipeLeft = pipe.x;
            const pipeRight = pipe.x + PIPE_WIDTH;
            const gapTop = pipe.gapStart;
            const gapBottom = pipe.gapStart + GAP;

            if (
              birdRight > pipeLeft &&
              birdLeft < pipeRight &&
              (birdTopPos < gapTop || birdBottom > gapBottom)
            ) {
              handleGameOver();
              if (score > highScore) {
                localStorage.setItem("highScore", score.toString());
                setHighScore(score);
              }
              break;
            }
          }

          // Ground / ceiling collision
          if (birdRef.current.top < 0 || birdBottom > window.innerHeight - GROUND_HEIGHT) {
            handleGameOver();
            if (score > highScore) {
              localStorage.setItem("highScore", score.toString());
              setHighScore(score);
            }
          }
        }
      }

      raf = requestAnimationFrame(update);
    };

    // Pipe spawning
    spawnInterval = setInterval(() => {
      const minGapStart = 120;
      const maxGapStart = window.innerHeight - GAP - GROUND_HEIGHT - 120;
      const gapStart = Math.floor(Math.random() * (maxGapStart - minGapStart)) + minGapStart;
      pipesRef.current.push({
        x: window.innerWidth + 50,
        gapStart,
        passed: false,
      });
    }, 2200);

    raf = requestAnimationFrame(update);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (spawnInterval) clearInterval(spawnInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, speed, handleGameOver]);

  return (
    <div
      onClick={handleClick}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url('${process.env.PUBLIC_URL}/bg.png')`,
        backgroundSize: "cover",
        cursor: "pointer",
      }}
    >
      <Bird top={birdTop} velocity={birdRef.current.velocity} />

      {/* Confetti - Only on high score */}
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} />}

      {/* Score + High Score */}
      <div
        className={popHighScore ? "high-score-pop" : ""}
        style={{
          position: "absolute",
          top: 30,
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: "white",
            textShadow: "3px 3px 0 black",
            marginBottom: "5px",
          }}
        >
          {score}
        </div>
        <div
          style={{
            fontSize: "20px",
            color: popHighScore ? "gold" : "#ccc",
            textShadow: popHighScore ? "0 0 10px gold" : "1px 1px 0 black",
          }}
        >
          ★ High: {highScore}
        </div>
      </div>

      {/* Pipes */}
      {pipes.map((pipe, idx) => (
        <React.Fragment key={idx}>
          <Pipe left={pipe.x} top={0} height={pipe.gapStart} type="top" />
          <Pipe
            left={pipe.x}
            top={pipe.gapStart + GAP}
            height={window.innerHeight - GROUND_HEIGHT - (pipe.gapStart + GAP)}
            type="bottom"
          />
        </React.Fragment>
      ))}

      {/* Ground */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: "200%",
          height: GROUND_HEIGHT,
          backgroundImage: `url('${process.env.PUBLIC_URL}/ground.png')`,
          backgroundRepeat: "repeat-x",
          animation: "groundMove 2s linear infinite",
        }}
      />

      {/* Start Screen */}
      {gameState === "start" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            color: "white",
            fontSize: "32px",
            textShadow: "2px 2px 0px black",
          }}
        >
          <div>🐦 Flappy Bird</div>
          <div style={{ fontSize: "24px", marginTop: "20px" }}>Click/Space to Start</div>
        </div>
      )}

      {/* Game Over */}
      {gameState === "gameover" && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(0,0,0,0.8)",
            padding: "30px 50px",
            borderRadius: "15px",
            color: "white",
            textAlign: "center",
            zIndex: 20,
            border: "3px solid gold",
          }}
        >
          <h1 style={{ fontSize: "36px", margin: "0 0 20px 0" }}>Game Over</h1>
          <p style={{ fontSize: "28px", margin: "10px 0" }}>Score: {score}</p>
          <p
            style={{
              fontSize: "28px",
              margin: "10px 0",
              color: score > highScore ? "gold" : "white",
            }}
          >
            High Score: {highScore}
          </p>
          <p style={{ fontSize: "20px", marginTop: "20px" }}>Click or press Space to restart</p>
        </div>
      )}

      {/* Pop Animation */}
      <style>{`
        .high-score-pop {
          animation: pop 0.8s ease-in-out;
        }
        @keyframes pop {
          0% { transform: translateX(-50%) scale(1); }
          50% { transform: translateX(-50%) scale(1.3); }
          100% { transform: translateX(-50%) scale(1); }
        }
        @keyframes groundMove {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default Game;

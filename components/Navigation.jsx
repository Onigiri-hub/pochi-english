import { useRouter } from "next/router";
import { getProgress } from "../utils/progressManager";
import { getMofu } from "../utils/mofuManager";
import { useState, useEffect } from "react";
import Papa from "papaparse";

export default function Navigation() {
  const router = useRouter();
  const [mofu, setMofu] = useState(null)

  useEffect(() => {
    getMofu().then(m => setMofu(m))
  }, [])

  const handleHomeClick = () => {
    router.push("/home");
  };

  return (
    <div className="navOuter">
      <div className="navInner">
        <button onClick={handleHomeClick} className="navItem" data-sound>
          <img src="/images/icons/home.svg" alt="ホーム" />
        </button>

        <button onClick={() => router.push("/unitList")} className="navItem" data-sound>
          <img src="/images/icons/dog.svg" alt="リスト" />
        </button>

        <button onClick={() => router.push("/stageList")} className="navItem">
          <img src="/images/icons/honekko.svg" alt="英単語" />
        </button>

        {/* モフボタン */}
        <button onClick={() => router.push("/mofu")} className="navItem">
          <img src="/images/icons/mofu.svg" alt="モフ" />
          <span style={{
            fontSize: "11px",
            fontWeight: "bold",
            color: "#FFD700",
            marginTop: "1px",
          }}>
            {mofu === null ? "..." : mofu}
          </span>
        </button>

        <button onClick={() => router.push("/progress")} className="navItem" data-sound>
          <img src="/images/icons/person.svg" alt="プロフ" />
        </button>
      </div>

      <style jsx>{`
        .navOuter {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          background: #333333;
          z-index: 1000;
        }
        .navInner {
          max-width: 400px;
          margin: 0 auto;
          height: 60px;
          display: flex;
          justify-content: space-around;
          align-items: center;
        }
        .navItem {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          color: white;
          padding: 5px;
        }
        .navItem img {
          width: 28px;
          height: 28px;
          object-fit: contain;
          margin-bottom: 2px;
        }
        .label {
          font-size: 10px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

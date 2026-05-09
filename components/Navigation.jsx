import { useRouter } from "next/router";
import { getProgress } from "../utils/progressManager";
import Papa from "papaparse";

export default function Navigation() {
  const router = useRouter();

  const handleHomeClick = () => {
    router.push("/home");
  };

  {/*  
  const handleHomeClick = async () => {
    try {
      const res = await fetch("/data/all_unit_list.csv");
      const text = await res.text();
      const allData = Papa.parse(text, { header: true, skipEmptyLines: true }).data;

      const unitNos = Array.from(new Set(allData.map(l => l.unit_NO))).sort((a, b) => a - b);
      let targetUnit = unitNos[0];

      for (const unitNo of unitNos) {
        const currentProgress = getProgress(unitNo);
        const totalInUnit = allData.filter(l => l.unit_NO === unitNo).length;
        if (currentProgress < totalInUnit) {
          targetUnit = unitNo;
          break;
        }
        targetUnit = unitNo;
      }
      router.push(`/lessonList?unit=${targetUnit}`);
    } catch (err) {
      router.push("/unitList");
    }
  };
  */}

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
          background: #333333; /* ①背景色 */
          z-index: 1000;
        }
        .navInner {
          max-width: 400px; /* ②アイコンを収める幅 */
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
          color: white; /* 文字色を白に */
          padding: 5px;
        }
        .navItem img {
          width: 28px; /* ③アイコン画像 */
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